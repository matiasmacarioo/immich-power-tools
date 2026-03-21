# Changelog

All notable changes to this project will be documented in this file.

## [v0.22.0] - 2026-03-21

### Improved
- **Family Tree Relationships**: Enhanced the relationship inference engine to support more complex family structures.
  - Added **Great-Aunts & Great-Uncles** (grandparents' siblings).
  - Added **Great-Nieces & Great-Nephews** (siblings' grandchildren).
  - Added **First Cousins Once Removed** with specific labels for better hierarchy.
  - Added **Grandparent-in-law & Grandchild-in-law** support.
  - Added **Great-grandparent-in-law & Great-grandchild-in-law** support.
- **Localized Relational Terms**: Updated Spanish translations to use more natural terms:
  - "**Tío segundo / Tía segunda**" for parent's first cousins.
  - "**Sobrino segundo / Sobrina segunda**" for first cousin's children.

### Fixed
- Fixed build errors related to missing `isHidden` property in `IPerson` interface.
- Resolved type mismatches in `AlbumPeople.tsx` and `PersonHideCell.tsx`.
- Improved hover badges to show relationships even for deceased family members.

## [v0.21.0] - 2026-03-18

### Added
- Initial implementation of the Relationship Tree.
- Support for basic relationships (Parents, Children, Siblings, Spouses, Cousins, In-laws).
- People management with birthday editing and alias support.
- Local storage for graph viewport and node positions.
- Deceased status and death date support for family members.
