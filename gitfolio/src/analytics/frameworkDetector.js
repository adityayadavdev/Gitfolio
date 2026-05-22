export async function detectFrameworks(repoContentsMap, fileContentFetcher) {
  const result = new Map();

  for (const [repoName, files] of repoContentsMap.entries()) {
    const frameworks = new Set();
    let devDependencies = [];

    for (const file of files) {
      let content;
      try {
        content = await fileContentFetcher(file);
      } catch (err) {
        // If we can't fetch the file, skip it
        continue;
      }

      if (file.endsWith('package.json')) {
        let pkg;
        try {
          pkg = JSON.parse(content);
        } catch (e) {
          continue;
        }
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        // Framework detection from dependencies
        if (deps.react) frameworks.add('react');
        if (deps.vue) frameworks.add('vue');
        if (deps['@angular/core']) frameworks.add('angular');
        if (deps.next) frameworks.add('next.js');
        if (deps.svelte) frameworks.add('svelte');
        if (deps.express) frameworks.add('express');
        if (deps.fastify) frameworks.add('fastify');
        if (deps['@nestjs/core']) frameworks.add('nestjs');
        if (deps.three) frameworks.add('three.js');
        if (deps.d3) frameworks.add('d3');
        if (deps['@tensorflow/tfjs']) frameworks.add('tensorflow.js');
        // Collect devDependencies
        if (pkg.devDependencies) {
          devDependencies = Object.keys(pkg.devDependencies);
        }
      } else if (file.endsWith('requirements.txt')) {
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          if (trimmed.startsWith('#') || !trimmed) continue;
          // Handle package==version or package>=version etc.
          const pkgName = trimmed.split(/[=<>!~]/)[0].trim();
          if (pkgName === 'flask') frameworks.add('Flask');
          if (pkgName === 'django') frameworks.add('Django');
          if (pkgName === 'fastapi') frameworks.add('FastAPI');
          if (pkgName === 'pandas') frameworks.add('pandas');
          if (pkgName === 'numpy') frameworks.add('numpy');
          if (pkgName === 'scikit-learn' || pkgName === 'sklearn') frameworks.add('scikit-learn');
          if (pkgName === 'tensorflow') frameworks.add('tensorflow');
          if (pkgName === 'torch') frameworks.add('pytorch');
          if (pkgName === 'keras') frameworks.add('keras');
        }
      } else if (file.endsWith('pom.xml')) {
        if (content.includes('<groupId>org.springframework.boot</groupId>') ||
            content.includes('spring-boot-starter')) {
          frameworks.add('Spring Boot');
        }
      } else if (file.endsWith('go.mod')) {
        if (content.includes('github.com/gin-gonic/gin')) frameworks.add('Gin');
        if (content.includes('github.com/labstack/echo/v4')) frameworks.add('Echo');
        if (content.includes('github.com/gofiber/fiber/v2')) frameworks.add('Fiber');
      } else if (file.endsWith('Cargo.toml')) {
        frameworks.add('Rust');
      } else if (file.endsWith('pubspec.yaml')) {
        // Check for flutter dependency
        if (content.includes('flutter:')) frameworks.add('Flutter');
      } else if (file.endsWith('build.gradle') || file.endsWith('build.gradle.kts')) {
        if (content.includes('com.android.application') || content.includes('applicationId')) {
          frameworks.add('Android');
        } else if (content.includes('apply plugin: \\\"java\\\"') || content.includes('plugins { id \\\"java\\\"')) {
          frameworks.add('Java');
        }
      }
    }

    result.set(repoName, {
      frameworks: Array.from(frameworks),
      devDependencies: devDependencies
    });
  }

  return result;
}

// Inline tests
(async () => {
  // Mock fileContentFetcher
  const mockFetcher = async (file) => {
    if (file.endsWith('package.json')) {
      return '{"dependencies": {"react": "^18.0.0", "express": "^4.18.0"}, "devDependencies": {"jest": "^28.0.0"}}';
    }
    if (file.endsWith('requirements.txt')) {
      return 'Flask==2.0.0\npandas>=1.3.0\n';
    }
    if (file.endsWith('pom.xml')) {
      return '<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter</artifactId></dependency></dependencies></project>';
    }
    if (file.endsWith('go.mod')) {
      return 'module example.com/m\n\ngo 1.18\n\nrequire github.com/gin-gonic/gin v1.7.0';
    }
    if (file.endsWith('Cargo.toml')) {
      return '[package]\nname = \"example\"\nversion = \"0.1.0\"\nedition = \"2021\"\n\n[dependencies]';
    }
    if (file.endsWith('pubspec.yaml')) {
      return 'name: myapp\npublish_to: \"none\"\nversion: 1.0.0+1\nenvironment:\n  sdk: \">=2.18.0 <3.0.0\"\n\ndependencies:\n  flutter:\n    sdk: flutter\n';
    }
    if (file.endsWith('build.gradle')) {
      return 'plugins {\n    id \"com.android.application\"\n    id \"kotlin-android\"\n}\n\nandroid {\n    compileSdk 33\n}\n\ndependencies {\n    implementation \"androidx.core:core-ktx:1.9.0\"\n    implementation \"androidx.appcompat:appcompat:1.5.1\"\n    implementation \"com.google.android.material:material:1.7.0\"\n}';
    }
    return '';
  };

  const repoContentsMap = new Map([
    [
      'repo1',
      ['package.json', 'src/index.js']
    ],
    [
      'repo2',
      ['requirements.txt', 'app.py']
    ],
    [
      'repo3',
      ['pom.xml', 'src/Main.java']
    ],
    [
      'repo4',
      ['go.mod', 'main.go']
    ],
    [
      'repo5',
      ['Cargo.toml', 'src/main.rs']
    ],
    [
      'repo6',
      ['pubspec.yaml', 'lib/main.dart']
    ],
    [
      'repo7',
      ['build.gradle', 'src/MainActivity.java']
    ],
    [
      'repo8',
      ['README.md'] // No known config files
    ]
  ]);

  const result = await detectFrameworks(repoContentsMap, mockFetcher);

  // Test repo1: should have react, express and devDependencies jest
  console.assert(
    JSON.stringify(result.get('repo1').frameworks.sort()) === JSON.stringify(['express', 'react'].sort()),
    'Repo1 frameworks mismatch'
  );
  console.assert(
    JSON.stringify(result.get('repo1').devDependencies) === JSON.stringify(['jest']),
    'Repo1 devDependencies mismatch'
  );

  // Test repo2: Flask and pandas
  console.assert(
    JSON.stringify(result.get('repo2').frameworks.sort()) === JSON.stringify(['Flask', 'pandas'].sort()),
    'Repo2 frameworks mismatch'
  );

  // Test repo3: Spring Boot
  console.assert(
    JSON.stringify(result.get('repo3').frameworks) === JSON.stringify(['Spring Boot']),
    'Repo3 frameworks mismatch'
  );

  // Test repo4: Gin
  console.assert(
    JSON.stringify(result.get('repo4').frameworks) === JSON.stringify(['Gin']),
    'Repo4 frameworks mismatch'
  );

  // Test repo5: Rust
  console.assert(
    JSON.stringify(result.get('repo5').frameworks) === JSON.stringify(['Rust']),
    'Repo5 frameworks mismatch'
  );

  // Test repo6: Flutter
  console.assert(
    JSON.stringify(result.get('repo6').frameworks) === JSON.stringify(['Flutter']),
    'Repo6 frameworks mismatch'
  );

  // Test repo7: Android
  console.assert(
    JSON.stringify(result.get('repo7').frameworks) === JSON.stringify(['Android']),
    'Repo7 frameworks mismatch'
  );

  // Test repo8: empty
  console.assert(
    result.get('repo8').frameworks.length === 0 && result.get('repo8').devDependencies.length === 0,
    'Repo8 should be empty'
  );
})();

