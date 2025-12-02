use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryConfig {
    pub name: String,
    pub paths: Vec<String>,
    pub patterns: Vec<String>,
}

pub struct Categorizer {
    // Will be implemented in Phase 2
}

impl Categorizer {
    pub fn new() -> Self {
        Self {}
    }
}
