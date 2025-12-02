use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfig {
    pub caches: HashMap<String, String>,
    pub dev_artifacts: Vec<String>,
}

impl Default for PlatformConfig {
    fn default() -> Self {
        let mut caches = HashMap::new();

        // macOS cache locations
        caches.insert("npm".to_string(), "~/.npm/_cacache".to_string());
        caches.insert("yarn".to_string(), "~/.yarn/cache".to_string());
        caches.insert("pnpm".to_string(), "~/.pnpm-store".to_string());
        caches.insert("homebrew".to_string(), "~/Library/Caches/Homebrew".to_string());
        caches.insert("pip".to_string(), "~/Library/Caches/pip".to_string());
        caches.insert("xcode".to_string(), "~/Library/Developer/Xcode/DerivedData".to_string());

        Self {
            caches,
            dev_artifacts: vec![
                "node_modules".to_string(),
                "target".to_string(),
                "build".to_string(),
                "dist".to_string(),
                ".gradle".to_string(),
                "Pods".to_string(),
                "venv".to_string(),
                ".venv".to_string(),
                "__pycache__".to_string(),
            ],
        }
    }
}
