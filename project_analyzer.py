#!/usr/bin/env python3
"""
Project Structure Analyzer - diagnozuje wydajność projektów Next.js
Uruchom w głównym folderze projektu: python project_analyzer.py
"""

import os
import json
import time
from pathlib import Path
from collections import defaultdict, Counter
import hashlib


class ProjectAnalyzer:
    def __init__(self, project_path="."):
        self.project_path = Path(project_path).resolve()
        self.report = {
            "project_name": self.project_path.name,
            "analysis_time": time.strftime("%Y-%m-%d %H:%M:%S"),
            "project_path": str(self.project_path)
        }

    def analyze(self):
        """Główna funkcja analizy"""
        print(f"🔍 Analizuję projekt: {self.project_path.name}")

        self.analyze_structure()
        self.analyze_package_json()
        self.analyze_next_config()
        self.analyze_dependencies()
        self.analyze_file_sizes()
        self.analyze_cache_folders()
        self.analyze_typescript_config()
        self.analyze_potential_issues()

        return self.report

    def analyze_structure(self):
        """Analiza struktury folderów i plików"""
        print("📁 Analizuję strukturę...")

        structure = {
            "total_files": 0,
            "folders": {},
            "file_types": Counter(),
            "large_folders": {}
        }

        # Foldery do pominięcia w szczegółowej analizie
        skip_folders = {'.git', '__pycache__', '.pytest_cache', '.vscode', '.idea'}

        for root, dirs, files in os.walk(self.project_path):
            # Pomijamy ukryte foldery
            dirs[:] = [d for d in dirs if not d.startswith('.') or d in {'.next', '.env'}]

            relative_path = Path(root).relative_to(self.project_path)
            folder_name = str(relative_path)

            if any(skip in folder_name for skip in skip_folders):
                continue

            file_count = len(files)
            structure["total_files"] += file_count
            structure["folders"][folder_name] = file_count

            # Liczenie typów plików
            for file in files:
                ext = Path(file).suffix.lower()
                structure["file_types"][ext] += 1

            # Foldery z dużą liczbą plików
            if file_count > 50:
                structure["large_folders"][folder_name] = file_count

        self.report["structure"] = structure

    def analyze_package_json(self):
        """Analiza package.json"""
        print("📦 Analizuję package.json...")

        package_path = self.project_path / "package.json"
        if not package_path.exists():
            self.report["package_json"] = {"error": "package.json not found"}
            return

        try:
            with open(package_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)

            deps = package_data.get("dependencies", {})
            dev_deps = package_data.get("devDependencies", {})

            analysis = {
                "dependencies_count": len(deps),
                "dev_dependencies_count": len(dev_deps),
                "scripts": list(package_data.get("scripts", {}).keys()),
                "main_dependencies": {},
                "potential_heavy_deps": []
            }

            # Sprawdzamy główne zależności
            key_deps = ["next", "react", "typescript", "tailwindcss", "@prisma/client", "prisma"]
            for dep in key_deps:
                if dep in deps:
                    analysis["main_dependencies"][dep] = deps[dep]
                elif dep in dev_deps:
                    analysis["main_dependencies"][dep] = dev_deps[dep]

            # Potencjalnie ciężkie zależności
            heavy_patterns = ["@aws-sdk", "webpack", "babel", "eslint", "@types", "prisma"]
            for dep in list(deps.keys()) + list(dev_deps.keys()):
                if any(pattern in dep for pattern in heavy_patterns):
                    version = deps.get(dep, dev_deps.get(dep, "unknown"))
                    analysis["potential_heavy_deps"].append(f"{dep}@{version}")

            self.report["package_json"] = analysis

        except Exception as e:
            self.report["package_json"] = {"error": str(e)}

    def analyze_next_config(self):
        """Analiza konfiguracji Next.js"""
        print("⚙️ Analizuję konfigurację Next.js...")

        config_files = ["next.config.js", "next.config.ts", "next.config.mjs"]
        config_analysis = {"found_configs": []}

        for config_file in config_files:
            config_path = self.project_path / config_file
            if config_path.exists():
                config_analysis["found_configs"].append(config_file)
                try:
                    with open(config_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        config_analysis[config_file] = {
                            "size": len(content),
                            "lines": len(content.splitlines()),
                            "has_webpack_config": "webpack:" in content or "webpack(" in content,
                            "has_experimental": "experimental:" in content,
                            "has_turbopack": "turbo" in content.lower(),
                            "content_preview": content[:500] + "..." if len(content) > 500 else content
                        }
                except Exception as e:
                    config_analysis[config_file] = {"error": str(e)}

        self.report["next_config"] = config_analysis

    def analyze_dependencies(self):
        """Analiza node_modules"""
        print("🗂️ Analizuję node_modules...")

        node_modules_path = self.project_path / "node_modules"
        if not node_modules_path.exists():
            self.report["node_modules"] = {"error": "node_modules not found"}
            return

        try:
            # Liczenie folderów w node_modules
            folders = [d for d in node_modules_path.iterdir() if d.is_dir()]
            scoped_folders = [d for d in folders if d.name.startswith('@')]

            # Największe foldery
            large_deps = {}
            for folder in folders[:50]:  # Sprawdzamy tylko pierwsze 50
                try:
                    size = sum(f.stat().st_size for f in folder.rglob('*') if f.is_file())
                    if size > 10 * 1024 * 1024:  # > 10MB
                        large_deps[folder.name] = f"{size / (1024 * 1024):.1f}MB"
                except:
                    continue

            self.report["node_modules"] = {
                "total_packages": len(folders),
                "scoped_packages": len(scoped_folders),
                "large_dependencies": large_deps
            }

        except Exception as e:
            self.report["node_modules"] = {"error": str(e)}

    def analyze_file_sizes(self):
        """Analiza rozmiarów plików"""
        print("📏 Analizuję rozmiary plików...")

        large_files = []
        total_size = 0
        file_types_sizes = defaultdict(int)

        skip_folders = {'.git', 'node_modules', '.next'}

        for root, dirs, files in os.walk(self.project_path):
            # Pomijamy duże foldery systemowe
            dirs[:] = [d for d in dirs if d not in skip_folders]

            for file in files:
                file_path = Path(root) / file
                try:
                    size = file_path.stat().st_size
                    total_size += size

                    ext = file_path.suffix.lower()
                    file_types_sizes[ext] += size

                    # Duże pliki (> 1MB)
                    if size > 1024 * 1024:
                        relative_path = file_path.relative_to(self.project_path)
                        large_files.append({
                            "path": str(relative_path),
                            "size": f"{size / (1024 * 1024):.1f}MB"
                        })
                except:
                    continue

        # Top 10 typów plików pod względem rozmiaru
        top_file_types = dict(sorted(file_types_sizes.items(),
                                     key=lambda x: x[1], reverse=True)[:10])

        self.report["file_sizes"] = {
            "total_size": f"{total_size / (1024 * 1024):.1f}MB",
            "large_files": sorted(large_files, key=lambda x: float(x["size"][:-2]), reverse=True)[:10],
            "top_file_types_by_size": {k: f"{v / (1024 * 1024):.1f}MB" for k, v in top_file_types.items()}
        }

    def analyze_cache_folders(self):
        """Analiza folderów cache"""
        print("🗃️ Analizuję foldery cache...")

        cache_folders = [".next", "node_modules/.cache", ".turbo", "dist", "build"]
        cache_analysis = {}

        for folder_name in cache_folders:
            folder_path = self.project_path / folder_name
            if folder_path.exists():
                try:
                    size = sum(f.stat().st_size for f in folder_path.rglob('*') if f.is_file())
                    file_count = len(list(folder_path.rglob('*')))
                    cache_analysis[folder_name] = {
                        "size": f"{size / (1024 * 1024):.1f}MB",
                        "files": file_count
                    }
                except Exception as e:
                    cache_analysis[folder_name] = {"error": str(e)}

        self.report["cache_folders"] = cache_analysis

    def analyze_typescript_config(self):
        """Analiza konfiguracji TypeScript"""
        print("🔧 Analizuję tsconfig.json...")

        tsconfig_path = self.project_path / "tsconfig.json"
        if tsconfig_path.exists():
            try:
                with open(tsconfig_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Usuwamy komentarze JSON dla podstawowej analizy
                    lines = [line.strip() for line in content.splitlines()
                             if not line.strip().startswith('//')]
                    clean_content = '\n'.join(lines)

                self.report["typescript_config"] = {
                    "found": True,
                    "size": len(content),
                    "has_strict": '"strict"' in content,
                    "has_incremental": '"incremental"' in content,
                    "content_preview": content[:300] + "..." if len(content) > 300 else content
                }
            except Exception as e:
                self.report["typescript_config"] = {"error": str(e)}
        else:
            self.report["typescript_config"] = {"found": False}

    def analyze_potential_issues(self):
        """Identyfikacja potencjalnych problemów"""
        print("⚠️ Szukam potencjalnych problemów...")

        issues = []

        # Sprawdź czy .next jest bardzo duży
        next_folder = self.project_path / ".next"
        if next_folder.exists():
            try:
                size = sum(f.stat().st_size for f in next_folder.rglob('*') if f.is_file())
                if size > 100 * 1024 * 1024:  # > 100MB
                    issues.append(f"Folder .next jest bardzo duży: {size / (1024 * 1024):.1f}MB")
            except:
                pass

        # Sprawdź duplikaty w package.json
        if "package_json" in self.report and "error" not in self.report["package_json"]:
            deps = self.report.get("package_json", {}).get("main_dependencies", {})
            if "tailwindcss" in deps:
                version = deps["tailwindcss"]
                if version.startswith("^4") or version.startswith("4"):
                    issues.append("TailwindCSS 4.x może wymagać innej konfiguracji")

        # Sprawdź liczbę plików TypeScript
        if "structure" in self.report:
            ts_files = self.report["structure"]["file_types"].get(".ts", 0)
            tsx_files = self.report["structure"]["file_types"].get(".tsx", 0)
            total_ts = ts_files + tsx_files
            if total_ts > 200:
                issues.append(f"Dużo plików TypeScript ({total_ts}) - może spowalniać kompilację")

        # Sprawdź czy są duże zależności
        if "node_modules" in self.report and "large_dependencies" in self.report["node_modules"]:
            large_deps = self.report["node_modules"]["large_dependencies"]
            if len(large_deps) > 5:
                issues.append(f"Wiele dużych zależności: {', '.join(list(large_deps.keys())[:3])}")

        self.report["potential_issues"] = issues

    def save_report(self, filename=None):
        """Zapisz raport do pliku"""
        if filename is None:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            filename = f"project_analysis_{self.project_path.name}_{timestamp}.json"

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, indent=2, ensure_ascii=False)

        return filename

    def print_summary(self):
        """Wydrukuj podsumowanie"""
        print("\n" + "=" * 60)
        print(f"📊 RAPORT ANALIZY: {self.report['project_name']}")
        print("=" * 60)

        if "structure" in self.report:
            print(f"📁 Pliki: {self.report['structure']['total_files']}")
            print(f"📁 Foldery: {len(self.report['structure']['folders'])}")

        if "package_json" in self.report and "dependencies_count" in self.report["package_json"]:
            deps = self.report["package_json"]["dependencies_count"]
            dev_deps = self.report["package_json"]["dev_dependencies_count"]
            print(f"📦 Zależności: {deps} + {dev_deps} dev")

        if "file_sizes" in self.report:
            print(f"💾 Całkowity rozmiar: {self.report['file_sizes']['total_size']}")

        if "potential_issues" in self.report and self.report["potential_issues"]:
            print(f"\n⚠️ POTENCJALNE PROBLEMY:")
            for issue in self.report["potential_issues"]:
                print(f"  • {issue}")
        else:
            print(f"\n✅ Nie znaleziono oczywistych problemów")

        print("\n" + "=" * 60)


def main():
    """Główna funkcja"""
    analyzer = ProjectAnalyzer()

    try:
        report = analyzer.analyze()
        filename = analyzer.save_report()
        analyzer.print_summary()

        print(f"\n💾 Raport zapisany: {filename}")
        print("\n🔍 Uruchom skrypt w drugim projekcie i porównaj raporty!")

    except Exception as e:
        print(f"❌ Błąd podczas analizy: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()