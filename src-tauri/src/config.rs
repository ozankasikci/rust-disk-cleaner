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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_config_default() {
        let config = PlatformConfig::default();

        // Verify cache locations are populated
        assert!(config.caches.contains_key("npm"));
        assert!(config.caches.contains_key("yarn"));
        assert!(config.caches.contains_key("pnpm"));
        assert!(config.caches.contains_key("homebrew"));
        assert!(config.caches.contains_key("pip"));
        assert!(config.caches.contains_key("xcode"));

        // Verify cache paths
        assert_eq!(config.caches.get("npm"), Some(&"~/.npm/_cacache".to_string()));
        assert_eq!(config.caches.get("yarn"), Some(&"~/.yarn/cache".to_string()));
    }

    #[test]
    fn test_platform_config_dev_artifacts() {
        let config = PlatformConfig::default();

        // Verify all expected dev artifacts are present
        assert!(config.dev_artifacts.contains(&"node_modules".to_string()));
        assert!(config.dev_artifacts.contains(&"target".to_string()));
        assert!(config.dev_artifacts.contains(&"build".to_string()));
        assert!(config.dev_artifacts.contains(&"dist".to_string()));
        assert!(config.dev_artifacts.contains(&".gradle".to_string()));
        assert!(config.dev_artifacts.contains(&"Pods".to_string()));
        assert!(config.dev_artifacts.contains(&"venv".to_string()));
        assert!(config.dev_artifacts.contains(&".venv".to_string()));
        assert!(config.dev_artifacts.contains(&"__pycache__".to_string()));
    }

    #[test]
    fn test_platform_config_serialization() {
        let config = PlatformConfig::default();

        // Test that config can be serialized to JSON
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("npm"));
        assert!(json.contains("node_modules"));

        // Test deserialization
        let deserialized: PlatformConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.caches.len(), config.caches.len());
        assert_eq!(deserialized.dev_artifacts.len(), config.dev_artifacts.len());
    }

    #[test]
    fn test_platform_config_clone() {
        let config = PlatformConfig::default();
        let cloned = config.clone();

        assert_eq!(config.caches.len(), cloned.caches.len());
        assert_eq!(config.dev_artifacts.len(), cloned.dev_artifacts.len());
    }
}
