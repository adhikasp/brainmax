//! Read-only access to the explainers SQLite DB written by kresna's n8n job (via gatotkaca's ingest forced command).
use rusqlite::{params_from_iter, Connection, OpenFlags};
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct Explainer {
    pub id: String,
    pub kind: &'static str,
    pub source: String,
    pub title: String,
    pub authors: Vec<String>,
    pub published: String,
    #[serde(rename = "paperDate")]
    pub paper_date: String,
    pub category: String,
    #[serde(rename = "absUrl")]
    pub abs_url: String,
    pub svg: String,
    pub text: String,
}

#[derive(Clone)]
pub struct Store {
    path: String,
}

impl Store {
    pub fn new(path: String) -> Self {
        Store { path }
    }

    /// A missing or unreadable DB is just "no explainers yet".
    fn open(&self) -> Option<Connection> {
        let c = Connection::open_with_flags(&self.path, OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX).ok()?;
        c.busy_timeout(std::time::Duration::from_secs(2)).ok()?;
        Some(c)
    }

    /// Newest paper day first, stable order within a day.
    pub fn ids(&self) -> Vec<String> {
        let Some(c) = self.open() else { return vec![] };
        let Ok(mut st) = c.prepare("SELECT id FROM explainers ORDER BY paper_date DESC, id LIMIT 2000") else { return vec![] };
        st.query_map([], |r| r.get::<_, String>(0)).map(|rows| rows.flatten().collect()).unwrap_or_default()
    }

    /// Rows for `ids` (max 10), returned in the order requested.
    pub fn get(&self, ids: &[String]) -> Vec<Explainer> {
        let ids: Vec<&String> = ids.iter().take(10).collect();
        if ids.is_empty() {
            return vec![];
        }
        let Some(c) = self.open() else { return vec![] };
        let marks = vec!["?"; ids.len()].join(",");
        let sql = format!("SELECT id,source,title,authors,published,paper_date,categories,abs_url,svg,text FROM explainers WHERE id IN ({marks})");
        let Ok(mut st) = c.prepare(&sql) else { return vec![] };
        let rows = st.query_map(params_from_iter(ids.iter()), |r| {
            let authors: String = r.get(3)?;
            let cats: String = r.get(6)?;
            Ok(Explainer {
                id: r.get(0)?,
                kind: "explainer",
                source: r.get(1)?,
                title: r.get(2)?,
                authors: authors.split("; ").filter(|s| !s.is_empty()).map(String::from).collect(),
                published: r.get(4)?,
                paper_date: r.get(5)?,
                category: cats.split_whitespace().next().unwrap_or("").to_string(),
                abs_url: r.get(7)?,
                svg: r.get(8)?,
                text: r.get(9)?,
            })
        });
        let mut out: Vec<Explainer> = rows.map(|r| r.flatten().collect()).unwrap_or_default();
        out.sort_by_key(|e| ids.iter().position(|i| **i == e.id).unwrap_or(usize::MAX));
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_db_is_empty() {
        let s = Store::new("/nonexistent/x.db".into());
        assert!(s.ids().is_empty());
        assert!(s.get(&["a".into()]).is_empty());
    }

    #[test]
    fn reads_rows_in_requested_order() {
        let p = std::env::temp_dir().join(format!("bm-test-{}.db", std::process::id()));
        let _ = std::fs::remove_file(&p);
        let c = Connection::open(&p).unwrap();
        c.execute_batch("CREATE TABLE explainers(id TEXT PRIMARY KEY, source TEXT, title TEXT, authors TEXT, categories TEXT, published TEXT, paper_date TEXT, abs_url TEXT, html_url TEXT, svg TEXT, text TEXT);
            INSERT INTO explainers(id,source,title,authors,categories,published,paper_date,abs_url,svg,text) VALUES
            ('arxiv:1','arxiv','A','x; y','cs.AI cs.LG','2026-01-01','2026-01-01','u','<svg/>','t'),
            ('arxiv:2','arxiv','B','','cs.CL','2026-01-02','2026-01-02','u','<svg/>','t');").unwrap();
        drop(c);
        let s = Store::new(p.to_string_lossy().into());
        assert_eq!(s.ids(), vec!["arxiv:2", "arxiv:1"]);
        let g = s.get(&["arxiv:1".into(), "arxiv:2".into()]);
        assert_eq!(g[0].id, "arxiv:1");
        assert_eq!(g[0].authors, vec!["x", "y"]);
        assert_eq!(g[0].category, "cs.AI");
        let _ = std::fs::remove_file(&p);
    }
}
