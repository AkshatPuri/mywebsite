"""Add a project card to the Limbvoid Games portfolio.

This script runs in GUI mode to easily construct, preview, and delete
project cards in the portfolio.
"""

from __future__ import annotations

import html
import re
import shutil
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import urllib.request
from pathlib import Path


class ToolTip:
    def __init__(self, widget: tk.Widget, text: str):
        self.widget = widget
        self.text = text
        self.tip_window = None
        self.widget.bind("<Enter>", self.show_tip)
        self.widget.bind("<Leave>", self.hide_tip)

    def show_tip(self, event=None):
        if self.tip_window or not self.text:
            return
        x = self.widget.winfo_rootx() + 20
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 2
        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.wm_geometry(f"+{x}+{y}")
        label = tk.Label(
            tw,
            text=self.text,
            justify=tk.LEFT,
            background="#ffffe0",
            foreground="#333333",
            relief=tk.SOLID,
            borderwidth=1,
            font=("TkDefaultFont", 9, "normal")
        )
        label.pack(ipadx=4, ipady=2)

    def hide_tip(self, event=None):
        tw = self.tip_window
        self.tip_window = None
        if tw:
            tw.destroy()


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "index.html"
JS_PATH = ROOT / "javascript" / "script.js"
DEFAULT_IMAGE_DIR = ROOT / "img"
DRY_RUN_START = "                <!-- DRY-RUN-CARD:START -->"
DRY_RUN_END = "                <!-- DRY-RUN-CARD:END -->"
DRY_RUN_TITLE = "Dry Run Project"
DRY_RUN_ROLE = "Empty project card for layout testing."
DRY_RUN_TAGS = "Draft,Test"


def main() -> int:
    return run_gui()


def remove_dry_run_cards(index_html: str) -> tuple[str, int]:
    pattern = rf"\n*[ \t]*{re.escape(DRY_RUN_START)}.*?{re.escape(DRY_RUN_END)}[ \t]*(?:\n+)?"
    return re.subn(pattern, "\n", index_html, flags=re.DOTALL)


def remove_project_by_title(index_html: str, title: str) -> tuple[str, int]:
    for t in (html.escape(title), title):
        pattern = rf"([ \t]*)<!--\s*{re.escape(t)}\s*\(span-\d\)\s*-->.*?\n\1</div>\s*\n?"
        updated_html, count = re.subn(pattern, "", index_html, flags=re.DOTALL | re.IGNORECASE)
        if count > 0:
            return updated_html, count
    return index_html, 0


def get_existing_project_titles(index_html: str) -> list[str]:
    pattern = re.compile(r'<h3 class="card-title">\s*([^<]+)\s*</h3>', re.IGNORECASE)
    return [html.unescape(m.group(1).strip()) for m in pattern.finditer(index_html)]


def get_pinned_featured_titles() -> list[str]:
    try:
        if not JS_PATH.exists():
            return []
        content = JS_PATH.read_text(encoding="utf-8")
        match = re.search(r"const pinnedFeaturedTitles = \[\s*([\s\S]*?)\s*\];", content)
        if not match:
            return []
        raw_titles = match.group(1)
        titles = re.findall(r"['\"](.*?)['\"]", raw_titles)
        return [t.strip() for t in titles]
    except Exception:
        return []


def save_pinned_featured_titles(titles: list[str]) -> None:
    if not JS_PATH.exists():
        raise FileNotFoundError(f"Could not find javascript file at: {JS_PATH}")
    content = JS_PATH.read_text(encoding="utf-8")
    array_str = ", ".join(f"'{t}'" for t in titles)
    replacement = f"const pinnedFeaturedTitles = [{array_str}];"
    updated_content, count = re.subn(
        r"const pinnedFeaturedTitles = \[\s*([\s\S]*?)\s*\];",
        replacement,
        content
    )
    if count == 0:
        raise ValueError("Could not find pinnedFeaturedTitles array definition in javascript/script.js")
    JS_PATH.write_text(updated_content, encoding="utf-8")


def get_all_featured_titles_from_html() -> list[str]:
    try:
        if not INDEX_PATH.exists():
            return []
        index_html = INDEX_PATH.read_text(encoding="utf-8")
        blocks = index_html.split("<!--")
        featured_titles = []
        for block in blocks:
            if "Featured Release" in block:
                title_match = re.search(r'<h3 class="card-title">\s*([^<]+)\s*</h3>', block)
                if title_match:
                    title = html.unescape(title_match.group(1).strip())
                    if title not in featured_titles:
                        featured_titles.append(title)
        return featured_titles
    except Exception:
        return []


def find_insert_index(index_html: str) -> int:
    match = re.search(r"</section>\s*</div>\s*</main>", index_html)
    return match.start() if match else -1


def project_exists(index_html: str, title: str) -> bool:
    title_pattern = re.escape(html.escape(title, quote=False))
    return re.search(rf'<h3 class="card-title">\s*{title_pattern}\s*</h3>', index_html) is not None


def prepare_media(image: str, title: str) -> str:
    if is_url(image):
        DEFAULT_IMAGE_DIR.mkdir(exist_ok=True)
        target = DEFAULT_IMAGE_DIR / f"{slugify(title)}{extension_from_url(image)}"
        urllib.request.urlretrieve(image, target)
        return to_site_path(target)

    source = Path(image)
    if not source.is_absolute():
        source = ROOT / source

    if not source.exists():
        raise FileNotFoundError(f"Image not found: {source}")

    if source.is_relative_to(DEFAULT_IMAGE_DIR) or source.is_relative_to(ROOT / "gifs"):
        return to_site_path(source)

    DEFAULT_IMAGE_DIR.mkdir(exist_ok=True)
    target = DEFAULT_IMAGE_DIR / f"{slugify(title)}{source.suffix.lower() or '.png'}"
    shutil.copy2(source, target)
    return to_site_path(target)


def preview_media(image: str, title: str) -> str:
    if is_url(image):
        return f"img/{slugify(title)}{extension_from_url(image)}"

    source = Path(image)
    if not source.is_absolute():
        source = ROOT / source
    if source.exists() and (source.is_relative_to(DEFAULT_IMAGE_DIR) or source.is_relative_to(ROOT / "gifs")):
        return to_site_path(source)
    return f"img/{slugify(title)}{source.suffix.lower() or '.png'}"


def is_url(value: str) -> bool:
    return value.startswith(("http://", "https://"))


def extension_from_url(url: str) -> str:
    ext = url.split("?")[0].split("#")[0].split(".")[-1].lower()
    return f".{ext}" if ext in {"gif", "jpeg", "jpg", "png", "webp"} else ".png"


def to_site_path(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "project"


def parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


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


class ProjectCardBuilderGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Limbvoid Games - Project Card Builder")
        self.root.geometry("560x540")
        self.root.minsize(500, 480)
        
        self.setup_styles()
        self.create_widgets()
        self.log("Limbvoid Project Builder UI started.")

    def setup_styles(self):
        style = ttk.Style(self.root)
        if "vista" in style.theme_names():
            style.theme_use("vista")
        elif "clam" in style.theme_names():
            style.theme_use("clam")

    def create_widgets(self):
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True)

        # Tab 1: Manage Cards
        tab_cards = ttk.Frame(self.notebook, padding="15")
        self.notebook.add(tab_cards, text=" Manage Cards ")

        # Form Frame
        form_frame = ttk.LabelFrame(tab_cards, text=" Project Card Details ", padding="10")
        form_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        form_frame.columnconfigure(1, weight=1)

        self.entry_title = self.create_row(form_frame, "Project Title:", 0, "e.g., Space Combat Prototype, Akshat's Engine")
        
        # Image row
        lbl_image = ttk.Label(form_frame, text="Image Path / URL:")
        lbl_image.grid(row=1, column=0, sticky=tk.W, padx=5, pady=4)
        
        img_frame = ttk.Frame(form_frame)
        img_frame.grid(row=1, column=1, sticky=tk.EW, padx=5, pady=4)
        img_frame.columnconfigure(0, weight=1)
        
        self.entry_image = ttk.Entry(img_frame)
        self.entry_image.grid(row=0, column=0, sticky=tk.EW)
        
        img_tip = "e.g., img/screenshot.png, gifs/gameplay.gif, or https://example.com/preview.png"
        ToolTip(lbl_image, img_tip)
        ToolTip(self.entry_image, img_tip)
        
        btn_browse = ttk.Button(img_frame, text="Browse...", command=self.browse_image)
        btn_browse.grid(row=0, column=1, padx=(5, 0))
        ToolTip(btn_browse, "Browse your local filesystem for a project image file")
        
        self.entry_role = self.create_row(form_frame, "Role / Contribution:", 2, "e.g., Solo Developer, Physics Programmer, Level Designer")
        self.entry_tags = self.create_row(form_frame, "Tags (comma separated):", 3, "e.g., C++, OpenGL, Unity, C#")
        self.entry_link = self.create_row(form_frame, "Project Link URL:", 4, "e.g., https://limbvoid.itch.io/my-game, https://github.com/AkshatPuri")

        # Checkboxes
        check_frame = ttk.Frame(form_frame)
        check_frame.grid(row=5, column=0, columnspan=2, sticky=tk.W, padx=5, pady=5)

        self.var_featured = tk.BooleanVar(value=False)
        self.var_wip = tk.BooleanVar(value=False)

        chk_featured = ttk.Checkbutton(check_frame, text="Featured Release", variable=self.var_featured)
        chk_featured.pack(side=tk.LEFT, padx=(0, 15))
        ToolTip(chk_featured, "Check to show a 'Featured Release' badge on the card")

        chk_wip = ttk.Checkbutton(check_frame, text="WIP Status", variable=self.var_wip)
        chk_wip.pack(side=tk.LEFT)
        ToolTip(chk_wip, "Check to display a WIP hammer status badge instead of direct link icons")

        # Remove Card Area
        remove_frame = ttk.LabelFrame(tab_cards, text=" Remove Existing Card ", padding="10")
        remove_frame.pack(fill=tk.X, pady=(0, 10))

        lbl_remove = ttk.Label(remove_frame, text="Select Card:")
        lbl_remove.pack(side=tk.LEFT, padx=(0, 10))

        try:
            initial_html = INDEX_PATH.read_text(encoding="utf-8")
            titles = get_existing_project_titles(initial_html)
        except Exception:
            titles = []

        self.combo_remove = ttk.Combobox(remove_frame, values=titles, state="readonly")
        self.combo_remove.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 10))
        
        remove_tip = "Select an existing card title to permanently delete it from index.html"
        ToolTip(lbl_remove, remove_tip)
        ToolTip(self.combo_remove, remove_tip)

        btn_remove_selected = ttk.Button(remove_frame, text="Remove Card", command=self.handle_remove_selected)
        btn_remove_selected.pack(side=tk.RIGHT)

        # Action Buttons
        btn_frame = ttk.Frame(tab_cards)
        btn_frame.pack(fill=tk.X, pady=10)

        btn_add = ttk.Button(btn_frame, text="Add Project Card", command=self.handle_add)
        btn_add.pack(side=tk.LEFT, padx=(0, 10), fill=tk.X, expand=True)

        btn_dry = ttk.Button(btn_frame, text="Add Dry-run Card", command=self.handle_dry)
        btn_dry.pack(side=tk.LEFT, padx=(0, 10), fill=tk.X, expand=True)

        btn_remove_dry = ttk.Button(btn_frame, text="Remove Dry-run Card", command=self.handle_remove_dry_run)
        btn_remove_dry.pack(side=tk.LEFT, fill=tk.X, expand=True)

        # Tab 2: Reorder Featured Cards
        tab_order = ttk.Frame(self.notebook, padding="15")
        self.notebook.add(tab_order, text=" Featured Order ")

        lbl_desc = ttk.Label(tab_order, text="Set show order of featured cards on the site (Top is displayed first):", font=("TkDefaultFont", 10, "bold"))
        lbl_desc.pack(anchor=tk.W, pady=(0, 10))

        list_frame = ttk.Frame(tab_order)
        list_frame.pack(fill=tk.BOTH, expand=True)

        self.list_featured = tk.Listbox(list_frame, selectmode=tk.SINGLE, font=("TkDefaultFont", 10))
        self.list_featured.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))

        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.list_featured.yview)
        scrollbar.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        self.list_featured.config(yscrollcommand=scrollbar.set)

        btn_order_frame = ttk.Frame(list_frame)
        btn_order_frame.pack(side=tk.RIGHT, fill=tk.Y)

        btn_up = ttk.Button(btn_order_frame, text="Move Up", command=self.handle_move_up)
        btn_up.pack(fill=tk.X, pady=5)
        ToolTip(btn_up, "Move selected featured card up in show order")

        btn_down = ttk.Button(btn_order_frame, text="Move Down", command=self.handle_move_down)
        btn_down.pack(fill=tk.X, pady=5)
        ToolTip(btn_down, "Move selected featured card down in show order")

        btn_save = ttk.Button(btn_order_frame, text="Save Order", command=self.handle_save_order)
        btn_save.pack(fill=tk.X, pady=(20, 5))
        ToolTip(btn_save, "Save the current show order back to javascript/script.js")

        # Bottom Logs Area (outside notebook, shown always at the bottom of the window)
        log_frame = ttk.LabelFrame(self.root, text=" Status Log ", padding="5")
        log_frame.pack(fill=tk.X, side=tk.BOTTOM, padx=15, pady=(0, 15))

        self.txt_log = tk.Text(log_frame, height=3, wrap=tk.WORD, state=tk.DISABLED, bg="#f0f0f0", fg="#333333")
        self.txt_log.pack(fill=tk.BOTH, expand=True)

        # Initial load of featured titles list
        self.featured_titles = []
        self.refresh_featured_list()

    def create_row(self, parent, label_text, row, tooltip_text=None):
        lbl = ttk.Label(parent, text=label_text)
        lbl.grid(row=row, column=0, sticky=tk.W, padx=5, pady=4)
        entry = ttk.Entry(parent)
        entry.grid(row=row, column=1, sticky=tk.EW, padx=5, pady=4)
        if tooltip_text:
            ToolTip(lbl, tooltip_text)
            ToolTip(entry, tooltip_text)
        return entry

    def browse_image(self):
        filename = filedialog.askopenfilename(
            title="Select Project Image",
            filetypes=[("Image Files", "*.png *.jpg *.jpeg *.gif *.webp"), ("All Files", "*.*")]
        )
        if filename:
            self.entry_image.delete(0, tk.END)
            self.entry_image.insert(0, filename)

    def log(self, message, is_error=False):
        self.txt_log.config(state=tk.NORMAL)
        prefix = "[ERROR] " if is_error else "[INFO] "
        self.txt_log.insert(tk.END, prefix + message + "\n")
        self.txt_log.see(tk.END)
        self.txt_log.config(state=tk.DISABLED)

    def update_remove_dropdown(self, new_html):
        new_titles = get_existing_project_titles(new_html)
        self.combo_remove["values"] = new_titles
        self.combo_remove.set("")

    def infer_link_details(self, url: str) -> tuple[str, str]:
        if not url:
            return "", ""
        url_lower = url.lower()
        for domain, (title, icon) in {
            "itch.io": ("Itch.io", "fab fa-itch-io"),
            "steam": ("Steam", "fab fa-steam"),
            "play.google.com": ("Google Play Store", "fab fa-google-play"),
            "google.play": ("Google Play Store", "fab fa-google-play"),
            "apps.apple.com": ("App Store", "fab fa-apple"),
            "nintendo.com": ("Nintendo Switch", "fab fa-nintendo-switch"),
            "xbox.com": ("Xbox", "fab fa-xbox"),
            "github.com": ("GitHub", "fab fa-github"),
        }.items():
            if domain in url_lower:
                return title, icon
        return "Website", "fas fa-link"

    def handle_add(self):
        title = self.entry_title.get().strip()
        image = self.entry_image.get().strip()
        role = self.entry_role.get().strip()
        tags = self.entry_tags.get().strip()
        link_url = self.entry_link.get().strip()

        try:
            index_html = INDEX_PATH.read_text(encoding="utf-8")
            missing = [f for f, val in [("Title", title), ("Image", image), ("Role", role), ("Tags", tags)] if not val]
            if missing:
                raise ValueError(f"Missing fields: {', '.join(missing)}")

            if project_exists(index_html, title):
                raise ValueError(f"Project card already exists for title: {title}")

            media_src = prepare_media(image, title)

            links = []
            if link_url:
                link_title, link_icon = self.infer_link_details(link_url)
                links.append({"url": link_url, "title": link_title, "icon": link_icon})

            card_html = build_card(
                title=title,
                role=role,
                tags=parse_csv(tags),
                media_src=media_src,
                links=links,
                wip=self.var_wip.get(),
                featured=self.var_featured.get(),
                test_card=False,
            )

            marker_index = find_insert_index(index_html)
            if marker_index == -1:
                raise ValueError("Could not find work-grid insertion marker in index.html.")

            updated_html = index_html[:marker_index] + "\n" + card_html + index_html[marker_index:]
            INDEX_PATH.write_text(updated_html, encoding="utf-8")

            self.log(f"Successfully added project card: {title}")
            self.update_remove_dropdown(updated_html)
            self.refresh_featured_list()
            messagebox.showinfo("Success", f"Project '{title}' added to portfolio successfully.")
        except Exception as e:
            self.log(str(e), is_error=True)
            messagebox.showerror("Error", str(e))

    def handle_dry(self):
        title = self.entry_title.get().strip() or DRY_RUN_TITLE
        image = self.entry_image.get().strip()
        role = self.entry_role.get().strip() or DRY_RUN_ROLE
        tags = self.entry_tags.get().strip() or DRY_RUN_TAGS
        link_url = self.entry_link.get().strip()

        try:
            index_html = INDEX_PATH.read_text(encoding="utf-8")

            media_src = preview_media(image, title) if image else None
            index_html, _ = remove_dry_run_cards(index_html)

            links = []
            if link_url:
                link_title, link_icon = self.infer_link_details(link_url)
                links.append({"url": link_url, "title": link_title, "icon": link_icon})

            card_html = build_card(
                title=title,
                role=role,
                tags=parse_csv(tags),
                media_src=media_src,
                links=links,
                wip=self.var_wip.get(),
                featured=self.var_featured.get(),
                test_card=True,
            )
            card_html = f"{DRY_RUN_START}\n{card_html}{DRY_RUN_END}\n"

            marker_index = find_insert_index(index_html)
            if marker_index == -1:
                raise ValueError("Could not find work-grid insertion marker in index.html.")

            updated_html = index_html[:marker_index] + "\n" + card_html + index_html[marker_index:]
            INDEX_PATH.write_text(updated_html, encoding="utf-8")

            self.log("Added visual dry-run card to index.html successfully.")
            self.update_remove_dropdown(updated_html)
            self.refresh_featured_list()
            messagebox.showinfo("Success", "Dry-run project card added to portfolio.")
        except Exception as e:
            self.log(str(e), is_error=True)
            messagebox.showerror("Error", str(e))

    def handle_remove_selected(self):
        selected = self.combo_remove.get().strip()
        if not selected:
            messagebox.showwarning("Remove Card", "Please select a project card to remove.")
            return

        confirm = messagebox.askyesno("Confirm Removal", f"Are you sure you want to permanently remove '{selected}'?")
        if not confirm:
            return

        try:
            index_html = INDEX_PATH.read_text(encoding="utf-8")
            updated_html, removed_count = remove_project_by_title(index_html, selected)
            if removed_count == 0:
                raise ValueError(f"Could not find card matching title: {selected}")
            INDEX_PATH.write_text(updated_html, encoding="utf-8")
            self.log(f"Permanently removed project card: {selected}")
            self.update_remove_dropdown(updated_html)
            self.refresh_featured_list()
            messagebox.showinfo("Success", f"Project card '{selected}' was successfully removed.")
        except Exception as e:
            self.log(str(e), is_error=True)
            messagebox.showerror("Error", str(e))

    def handle_remove_dry_run(self):
        try:
            index_html = INDEX_PATH.read_text(encoding="utf-8")
            updated_html, removed_count = remove_dry_run_cards(index_html)
            if removed_count == 0:
                self.log("No dry-run project card found in index.html.")
                messagebox.showinfo("Remove Dry Run", "No dry-run project card was found.")
                return
            INDEX_PATH.write_text(updated_html, encoding="utf-8")
            self.log(f"Removed {removed_count} dry-run project card(s).")
            self.update_remove_dropdown(updated_html)
            self.refresh_featured_list()
            messagebox.showinfo("Success", f"Removed {removed_count} dry-run project card(s) from portfolio.")
        except Exception as e:
            self.log(str(e), is_error=True)
            messagebox.showerror("Error", str(e))

    def handle_move_up(self):
        selected_indices = self.list_featured.curselection()
        if not selected_indices:
            return
        for idx in selected_indices:
            if idx == 0:
                continue
            self.featured_titles[idx], self.featured_titles[idx - 1] = self.featured_titles[idx - 1], self.featured_titles[idx]
            self.update_listbox(idx - 1)

    def handle_move_down(self):
        selected_indices = self.list_featured.curselection()
        if not selected_indices:
            return
        for idx in selected_indices:
            if idx == len(self.featured_titles) - 1:
                continue
            self.featured_titles[idx], self.featured_titles[idx + 1] = self.featured_titles[idx + 1], self.featured_titles[idx]
            self.update_listbox(idx + 1)

    def handle_save_order(self):
        try:
            save_pinned_featured_titles(self.featured_titles)
            self.log("Successfully saved new featured cards show order to script.js")
            messagebox.showinfo("Success", "Featured cards order saved successfully.")
        except Exception as e:
            self.log(str(e), is_error=True)
            messagebox.showerror("Error", str(e))

    def refresh_featured_list(self):
        html_featured = get_all_featured_titles_from_html()
        pinned = get_pinned_featured_titles()

        merged = []
        for title in pinned:
            if title in html_featured and title not in merged:
                merged.append(title)
        for title in html_featured:
            if title not in merged:
                merged.append(title)

        self.featured_titles = merged
        self.update_listbox()

    def update_listbox(self, select_idx=None):
        self.list_featured.delete(0, tk.END)
        for title in self.featured_titles:
            self.list_featured.insert(tk.END, title)
        if select_idx is not None:
            self.list_featured.select_set(select_idx)
            self.list_featured.activate(select_idx)


def run_gui() -> int:
    root = tk.Tk()
    app = ProjectCardBuilderGUI(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
