"""Add a project card to the Limbvoid Games portfolio.

Examples:
    python tools/add_project_card.py --title "My Game" --image screenshots/my-game.png --role "Gameplay prototype" --tags "C#,Unity" --link "https://example.com" --link-title "Website"
    python tools/add_project_card.py --title "New Tool" --image "https://example.com/screenshot.png" --role "Editor utility" --tags "Godot,Tool" --link "https://limbvoid.itch.io/new-tool" --icon "fab fa-itch-io"
    python tools/add_project_card.py --dry-run
    python tools/add_project_card.py --remove-dry-run
"""

from __future__ import annotations

import argparse
import html
import re
import shutil
import sys
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
DEFAULT_IMAGE_DIR = ROOT / "img"
INSERT_MARKER = "\n                </section>\n            </div>\n        </main>"
DRY_RUN_START = "                <!-- DRY-RUN-CARD:START -->"
DRY_RUN_END = "                <!-- DRY-RUN-CARD:END -->"
DRY_RUN_TITLE = "Dry Run Project"
DRY_RUN_ROLE = "Empty project card for layout testing."
DRY_RUN_TAGS = "Draft,Test"

ICON_BY_TITLE = {
    "app store": "fab fa-apple",
    "github": "fab fa-github",
    "google play store": "fab fa-google-play",
    "itch.io": "fab fa-itch-io",
    "nintendo switch": "fab fa-nintendo-switch",
    "steam": "fab fa-steam",
    "website": "fas fa-link",
    "xbox": "fab fa-xbox",
}


def main() -> int:
    args = parse_args()
    index_html = INDEX_PATH.read_text(encoding="utf-8")

    if args.remove_dry_run:
        updated_html, removed_count = remove_dry_run_cards(index_html)
        if removed_count == 0:
            print("No dry-run project card found.")
            return 0
        INDEX_PATH.write_text(updated_html, encoding="utf-8")
        print(f"Removed {removed_count} dry-run project card.")
        return 0

    normalize_args(args)

    if not args.dry_run and project_exists(index_html, args.title):
        print(f"Project card already exists for title: {args.title}", file=sys.stderr)
        return 1

    if args.print_only:
        media_src = preview_media(args.image, args.title, args.no_copy) if args.image else None
    elif args.dry_run:
        media_src = preview_media(args.image, args.title, args.no_copy) if args.image else None
        index_html, _ = remove_dry_run_cards(index_html)
    else:
        media_src = prepare_media(args.image, args.title, args.no_copy)

    card_html = build_card(
        title=args.title,
        role=args.role,
        tags=parse_csv(args.tags),
        media_src=media_src,
        links=parse_links(args),
        wip=args.wip,
        featured=args.featured,
        test_card=args.dry_run,
    )
    if args.dry_run:
        card_html = f"{DRY_RUN_START}\n{card_html}{DRY_RUN_END}\n"

    if args.print_only:
        print(card_html)
        return 0

    marker_index = find_insert_index(index_html)
    if marker_index == -1:
        print("Could not find work-grid insertion marker in index.html.", file=sys.stderr)
        return 1

    updated_html = index_html[:marker_index] + "\n" + card_html + index_html[marker_index:]
    INDEX_PATH.write_text(updated_html, encoding="utf-8")
    if args.dry_run:
        print("Added dry-run project card to index.html.")
        print("Remove it with: python tools/add_project_card.py --remove-dry-run")
    else:
        print(f"Added project card: {args.title}")
        print(f"Media source: {media_src}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Add a project card to index.html.")
    parser.add_argument("--title", help="Project title shown on the card.")
    parser.add_argument("--image", help="Local image path, relative asset path, or image URL.")
    parser.add_argument("--role", help="Short one-line contribution/role text.")
    parser.add_argument("--tags", help="Comma-separated tags, for example: C#,Unity")
    parser.add_argument("--link", help="Primary project URL.")
    parser.add_argument("--link-title", default="Website", help="Accessible title for the primary link.")
    parser.add_argument("--icon", help="Font Awesome class for the primary link icon.")
    parser.add_argument(
        "--extra-link",
        action="append",
        default=[],
        help='Additional link in the form "url|title|icon", for example "https://...|Steam|fab fa-steam".',
    )
    parser.add_argument("--featured", action="store_true", help="Add the Featured Release badge.")
    parser.add_argument("--wip", action="store_true", help="Show WIP status instead of link icons.")
    parser.add_argument("--no-copy", action="store_true", help="Use --image as-is instead of copying/downloading it.")
    parser.add_argument("--dry-run", action="store_true", help="Add/update an empty test card in index.html.")
    parser.add_argument("--remove-dry-run", action="store_true", help="Remove the dry-run test card from index.html.")
    parser.add_argument("--print-only", action="store_true", help="Print generated card HTML without editing files.")
    return parser.parse_args()


def normalize_args(args: argparse.Namespace) -> None:
    if args.dry_run:
        args.title = args.title or DRY_RUN_TITLE
        args.role = args.role or DRY_RUN_ROLE
        args.tags = args.tags or DRY_RUN_TAGS
        return

    missing_fields = [field for field in ("title", "image", "role", "tags") if not getattr(args, field)]
    if missing_fields:
        missing = ", ".join(f"--{field}" for field in missing_fields)
        print(f"Missing required argument(s): {missing}", file=sys.stderr)
        print("Use --dry-run to add an empty visual test card.", file=sys.stderr)
        sys.exit(2)


def remove_dry_run_cards(index_html: str) -> tuple[str, int]:
    pattern = re.compile(
        rf"\n*[ \t]*{re.escape(DRY_RUN_START)}[ \t]*\n.*?{re.escape(DRY_RUN_END)}[ \t]*(?:\n+)?",
        re.DOTALL,
    )
    updated_html, removed_count = pattern.subn("\n", index_html)
    return updated_html, removed_count


def find_insert_index(index_html: str) -> int:
    marker_index = index_html.rfind(INSERT_MARKER)
    if marker_index != -1:
        return marker_index

    matches = list(re.finditer(r"\n[ \t]*</section>[ \t]*\n[ \t]*</div>[ \t]*\n[ \t]*</main>", index_html))
    return matches[-1].start() if matches else -1


def project_exists(index_html: str, title: str) -> bool:
    title_pattern = re.escape(html.escape(title, quote=False))
    return re.search(rf'<h3 class="card-title">\s*{title_pattern}\s*</h3>', index_html) is not None


def prepare_media(image: str, title: str, no_copy: bool) -> str:
    if no_copy:
        return normalize_asset_path(image)

    if is_url(image):
        DEFAULT_IMAGE_DIR.mkdir(exist_ok=True)
        target = DEFAULT_IMAGE_DIR / f"{slugify(title)}{extension_from_url(image)}"
        urllib.request.urlretrieve(image, target)
        return to_site_path(target)

    source = Path(image)
    if not source.is_absolute():
        source = ROOT / source

    if not source.exists():
        print(f"Image not found: {source}", file=sys.stderr)
        sys.exit(1)

    if source.is_relative_to(DEFAULT_IMAGE_DIR) or source.is_relative_to(ROOT / "gifs"):
        return to_site_path(source)

    DEFAULT_IMAGE_DIR.mkdir(exist_ok=True)
    target = DEFAULT_IMAGE_DIR / f"{slugify(title)}{source.suffix.lower() or '.png'}"
    shutil.copy2(source, target)
    return to_site_path(target)


def preview_media(image: str, title: str, no_copy: bool) -> str:
    if no_copy:
        return normalize_asset_path(image)
    if is_url(image):
        return f"img/{slugify(title)}{extension_from_url(image)}"

    source = Path(image)
    if not source.is_absolute():
        source = ROOT / source
    if source.exists() and (source.is_relative_to(DEFAULT_IMAGE_DIR) or source.is_relative_to(ROOT / "gifs")):
        return to_site_path(source)
    return f"img/{slugify(title)}{source.suffix.lower() or '.png'}"


def is_url(value: str) -> bool:
    parsed = urllib.parse.urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def extension_from_url(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    suffix = Path(path).suffix.lower()
    return suffix if suffix in {".gif", ".jpeg", ".jpg", ".png", ".webp"} else ".png"


def normalize_asset_path(path: str) -> str:
    return path.replace("\\", "/")


def to_site_path(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "project"


def parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_links(args: argparse.Namespace) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    if args.link:
        title = args.link_title
        icon = args.icon or ICON_BY_TITLE.get(title.lower(), "fas fa-link")
        links.append({"url": args.link, "title": title, "icon": icon})

    for raw_link in args.extra_link:
        parts = [part.strip() for part in raw_link.split("|")]
        if len(parts) != 3 or not all(parts):
            print(f'Invalid --extra-link value: "{raw_link}". Expected "url|title|icon".', file=sys.stderr)
            sys.exit(1)
        links.append({"url": parts[0], "title": parts[1], "icon": parts[2]})
    return links


def build_card(
    title: str,
    role: str,
    tags: list[str],
    media_src: str | None,
    links: list[dict[str, str]],
    wip: bool,
    featured: bool,
    test_card: bool,
) -> str:
    escaped_title = html.escape(title)
    escaped_role = html.escape(role)
    tags_html = "\n".join(f'                                <span class="tag">{html.escape(tag)}</span>' for tag in tags)
    badge_html = '                            <span class="card-badge">Featured Release</span>\n' if featured else ""
    action_html = build_action_html(links, wip)
    action_block = f"\n{action_html}" if action_html else ""
    card_classes = "bento-card span-2 project-card is-test-card" if test_card else "bento-card span-2 project-card"
    media_html = build_media_html(media_src, escaped_title)

    return f"""                <!-- {escaped_title} (span-2) -->
                <div class="{card_classes}">
{media_html}
                    <div class="card-info">
                        <div class="card-meta">
{badge_html}                            <h3 class="card-title">{escaped_title}</h3>
                            <p class="card-role">{escaped_role}</p>
                            <div class="card-tags">
{tags_html}
                            </div>
                        </div>{action_block}
                    </div>
                </div>
"""


def build_media_html(media_src: str | None, escaped_title: str) -> str:
    if not media_src:
        return """                    <div class="card-media card-media-empty" aria-hidden="true"></div>"""

    escaped_media = html.escape(media_src, quote=True)
    return f"""                    <div class="card-media">
                        <img src="{escaped_media}" alt="{escaped_title}" loading="lazy">
                    </div>"""


def build_action_html(links: list[dict[str, str]], wip: bool) -> str:
    if wip:
        return """                        <div class="card-status">
                            <span class="status-wip"><i class="fas fa-hammer"></i> WIP</span>
                        </div>"""

    if not links:
        return ""

    link_lines = []
    for link in links:
        url = html.escape(link["url"], quote=True)
        title = html.escape(link["title"], quote=True)
        icon = html.escape(link["icon"], quote=True)
        link_lines.append(f'                            <a href="{url}" target="_blank" rel="noopener" title="{title}"><i class="{icon}"></i></a>')

    return f"""                        <div class="card-links">
{chr(10).join(link_lines)}
                        </div>"""


if __name__ == "__main__":
    raise SystemExit(main())
