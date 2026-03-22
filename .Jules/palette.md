## 2024-05-18 - Missing ARIA Labels on Icon-Only Sidebar Buttons
**Learning:** Found multiple icon-only interactive elements in reusable layout components (Sidebar, ThemeSwitcher) lacking `aria-label`s, making them inaccessible to screen readers. Specifically, toggle buttons need dynamic labels to indicate current/next state.
**Action:** Always add dynamic `aria-label`s to toggleable icon buttons (e.g. `collapsed ? "Expand" : "Collapse"`) to ensure the action is clear to users relying on assistive technologies.
