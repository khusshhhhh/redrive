import requests

# GitHub API URL format
GITHUB_API_URL = "https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"

# Folders to exclude
EXCLUDE_FOLDERS = {"node_modules", ".git", "dist", "coverage", ".next", ".cache", ".vscode"}

def fetch_repo_tree(github_repo_url):
    """Fetch the repository tree from GitHub API."""
    try:
        parts = github_repo_url.rstrip('/').split("/")
        owner, repo = parts[-2], parts[-1]
        url = GITHUB_API_URL.format(owner=owner, repo=repo)
        response = requests.get(url)

        if response.status_code == 200:
            return response.json().get("tree", []), owner, repo
        else:
            print(f"❌ Error: Unable to fetch repository data (Status Code {response.status_code})")
            return [], None, None
    except Exception as e:
        print(f"❌ Error: {e}")
        return [], None, None

def generate_project_tree(repo_tree):
    """Generates a tree structure dictionary, excluding specified folders."""
    tree_structure = {}

    for item in repo_tree:
        path_parts = item["path"].split("/")
        current_level = tree_structure

        if any(folder in path_parts for folder in EXCLUDE_FOLDERS):
            continue

        for part in path_parts:
            if part not in current_level:
                current_level[part] = {}
            current_level = current_level[part]

    return tree_structure

def print_tree(tree, indent="", file=None, md_file=None):
    """Prints and writes the project tree to text and markdown files."""
    for key, value in tree.items():
        line = f"{indent}📁 {key}" if value else f"{indent}📄 {key}"
        print(line)

        if file:
            file.write(line + "\n")

        if md_file:
            md_line = f"{indent}- 📂 **{key}**" if value else f"{indent}- 📄 {key}"
            md_file.write(md_line + "\n")

        if isinstance(value, dict):
            print_tree(value, indent + "    ", file, md_file)

# Get GitHub repo URL from user
repo_url = input("🔗 Enter GitHub repository URL: ").strip()

# Fetch repo tree and generate structure
repo_tree, owner, repo_name = fetch_repo_tree(repo_url)
if repo_tree:
    print("\n📂 Project Structure (excluding node_modules, .git, dist, etc.):\n")

    project_tree = generate_project_tree(repo_tree)

    # Save to a text file and Markdown file
    text_filename = "project_tree.txt"
    md_filename = "project_tree.md"

    with open(text_filename, "w", encoding="utf-8") as file, open(md_filename, "w", encoding="utf-8") as md_file:
        # Write Markdown Header
        md_file.write(f"# 📌 {repo_name} Repository Structure\n")
        md_file.write(f"**GitHub Repo:** [{repo_url}]({repo_url})\n\n")
        md_file.write("## 📂 Project Tree\n\n")

        print_tree(project_tree, file=file, md_file=md_file)

    print(f"\n✅ Project tree saved as `{text_filename}` and `{md_filename}` 🎉")
