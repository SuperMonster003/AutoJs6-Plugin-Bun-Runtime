<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="{{ bun_logo_url }}" alt="{{ icon_alt }}" border="0" width="128" />
  </p>

  <p>{{ text_plugin_synopsis }}</p>

  <p>
    <a href="{{ repo_url }}/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/{{ repo_slug }}?label=Release"/></a>
    <a href="{{ repo_url }}/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/{{ repo_slug }}?color=A24232&label=Issues"/></a>
    <a href="{{ license_url }}"><img alt="GitHub License" src="https://img.shields.io/github/license/{{ repo_slug }}?color=534BAE&label=License"/></a>
  </p>
</div>

******

### {{ h3_languages }}

******

{{ p_languages_all_supported }}:

{{ placeholder_ul_languages_all_supported }}

******

### {{ h3_introduction }}

******

{{ p_introduction }}

******

### {{ h3_usage }}

******

{{ placeholder_usage_steps }}

> {{ p_usage_note }}

******

### {{ h3_quick_start }}

******

{{ p_quick_start_intro }}:

```javascript
"bun";

console.log(`Bun ${Bun.version}`);
console.log(process.platform);
```

{{ p_quick_start_result }}

{{ p_typescript_intro }}:

```typescript
"bun";

type Greeting = { name: string };
const greeting: Greeting = { name: "AutoJs6" };
console.log(`Hello, ${greeting.name} from Bun ${Bun.version}`);
```

{{ p_more_samples }}

******

### {{ h3_features }}

******

{{ placeholder_features }}

******

### {{ h3_limitations }}

******

{{ placeholder_limitations }}

******

### {{ h3_faq }}

******

{{ placeholder_faq }}

******

### {{ h3_compatibility }}

******

{{ placeholder_compatibility_points }}

******

### {{ h3_security }}

******

{{ placeholder_security_points }}

******

### {{ runtime_help_heading }}

******

{{ placeholder_runtime_help }}

******

### {{ h3_plugin_interface }}

******

{{ p_plugin_interface }}:

```text
application id: {{ plugin_application_id }}
plugin id: {{ plugin_id }}
engine: {{ plugin_engine }}
variant: {{ plugin_variant }}
service action: {{ plugin_service_action }}
service category: {{ plugin_service_category }}
aidl interface: {{ plugin_aidl_interface }}
contract version: {{ plugin_contract_version }}
aidl methods: getInfo(), getRuntimeInfo(), runScript(request, source, callback), cancelScript(executionId), prewarmRuntime()
minimum host build: {{ required_host_version_code }} ({{ required_host_version_name }})
source limit: {{ max_source_size }}
combined stdout/stderr streaming budget: {{ max_output_size }}
default timeout: {{ default_timeout }}
```

{{ p_contract }}

{{ p_16kb_status }}

******

### {{ h3_roadmap }}

******

{{ p_roadmap }}

- [{{ text_link_roadmap }}]({{ roadmap_url }})

******

### {{ h3_release_history }}

******

{{ placeholder_latest_release_history }}

##### {{ h5_more_release_history }}

- {{ placeholder_read_more_in_changelog_md }}

******

### {{ h3_build }}

******

{{ p_build_intro }}

```powershell
node tools\bun-runtime\verify-runtime.mjs
node --test tools\bun-runtime\release\release-asset-common.test.mjs
py .python\generate_markdown.py --check
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
```

******

### {{ h3_localization }}

******

{{ p_localization }}

```text
.readme/common.json
.readme/lang_*.json
.readme/template_readme.md
.readme/template_plugin_instruction.md
.changelog/lang_*.json
.changelog/template_changelog.md
.python/generate_markdown.py
app/src/main/assets/doc/CHANGELOG-*.md
app/src/main/res/values*/strings.xml
app/src/main/res/raw*/plugin_instruction.md
```

******

### {{ h3_license }}

******

{{ p_license }}

******

### {{ h3_links }}

******

- {{ text_link_autojs6 }}: {{ autojs6_url }}
- {{ text_link_bun }}: {{ bun_official_url }}
- {{ text_link_bun_release }}: {{ bun_release_url }}
- {{ text_link_third_party_notices }}: {{ third_party_notices_url }}


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-Bun-Runtime/blob/master/docs/16kb.md)
