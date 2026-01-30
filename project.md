Project Specification: DDS Warehouse Management System

1. Project Overview

Name: DDS Warehouse Inventory System
Type: Web Application (Single Page Application)
Goal: To visualize warehouse inventory data (replacing Excel files) with a user-friendly dashboard, search capability, and QR code label printing feature.

2. Tech Stack

Framework: React (Functional Components, Hooks)

Styling: Tailwind CSS

Icons: lucide-react

Data Handling: JSON / Client-side Object Mapping

3. Data Structure & Mockup Logic

3.1 Real Data Sample (REAL_INVENTORY_DATA)

Use this array as the "Seed Data". The system should map these items to their respective Bins.

const REAL_INVENTORY_DATA = [
  { bin: "OB_Non A1-1", code: "C06110010", name: "แฟ้มสันกว้าง ช้าง 120 A4 3\" ดำ 6 เล่ม:P", qty: 87, unit: "EA" },
  { bin: "OB_Non A1-1", code: "C06110020", name: "แฟ้มสันกว้าง ช้าง 120F 3\" ดำ 6 เล่ม:P", qty: 1, unit: "EA" },
  { bin: "OB_Non A1-1", code: "C05413540", name: "กระดาษต่อเนื่องGeneralไม่มีเส้น11x11(1P)", qty: 22, unit: "EA" },
  { bin: "OB_Non A1-2", code: "C06111260", name: "แฟ้มก้านยกตราช้าง 115A4 2 นิ้ว สีดำ", qty: 36, unit: "EA" },
  { bin: "OB_Non A1-2", code: "C06111240", name: "แฟ้มก้านยกตราช้าง 112A4 2 นิ้ว สีดำ", qty: 12, unit: "EA" },
  { bin: "OB_Non Q27-6", code: "C04320190", name: "กระดาษโปสเตอร์สี 2 หน้า สีครีม", qty: 8, unit: "EA" },
  { bin: "OB_Non Q27-6", code: "C04320160", name: "กระดาษโปสเตอร์สี 2 หน้า สีแดง", qty: 61, unit: "EA" },
  { bin: "OB_Non Q27-6", code: "C04320220", name: "กระดาษโปสเตอร์สี 2 หน้า สีส้ม", qty: 6, unit: "EA" },
];


3.2 Zones Configuration

const ZONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'Premium'];


3.3 Data Generation Logic (Algorithm)

Since we don't have the full dataset, the system must generate a structure for all zones.

Iterate through ZONES.

Create Shelves/Bins:

Standard Zones (A-V): Assume 3 Shelves per Zone.

Premium Zone: Assume 1 Shelf.

Each Shelf has 4 Levels (Bins 1-4).

Naming Convention:

Standard: OB_Non {Zone}{Shelf}-{Level} (e.g., OB_Non A1-1)

Premium: OB_Premium {Level} (e.g., OB_Premium 1)

Populate Bins:

Check Real Data: If REAL_INVENTORY_DATA contains items for the current Bin ID, insert them.

Dummy Data: If no real data exists, use a random chance (e.g., 30%) to insert "Dummy Products" to simulate a working warehouse.

Empty: The rest remain empty arrays [].

Dummy Data Generator Function:
Should generate random items like:

{ code: "DUMMY-001", name: "ปากกาลูกลื่น...", qty: 50, unit: "ด้าม", isDummy: true }

4. Feature Requirements

4.1 Dashboard (Home View)

Statistics Cards:

Total Bins (Count of all generated bins)

Occupied Bins (Count of bins with items)

Occupancy Rate (%)

Total Items Qty

Zone Grid:

Display all Zones as cards.

Show a progress bar indicating how full the zone is.

Color code the bar: Green (<40%), Blue (<80%), Red (>80%).

4.2 Zone Detail View

Shelf Organization: Group bins by their Shelf number (e.g., "Shelf A1", "Shelf A2").

Bin Cards:

Show Bin ID (e.g., A1-1).

Status Indicator: Blue/Filled (Occupied) vs Grey/Empty.

Show "Sim" badge if data is dummy.

Print Mode:

A toggle button "Print QR Labels".

When active, clicking a bin selects/deselects it instead of opening details.

"Select All" / "Deselect All" button.

Floating Action Button to "Print Selected (A5)".

4.3 Bin Detail View

Header: Breadcrumb navigation (Back button > Zone > Bin ID).

Inventory Table:

Columns: Product Code, Name, Qty, Unit, Status.

Status Logic: If Qty < 10 show "Low Stock" (Red badge), else "In Stock" (Green badge).

4.4 Global Search

Input: Text field in the navbar.

Scope: Search against code and name of all items in the warehouse.

Results: Display matching items with their Location (Bin ID). Clicking a result navigates to that Bin.

4.5 Printing System (Crucial)

Format: A5 Paper Size (Landscape preference).

CSS @media print:

Hide Navbar, Sidebar, and non-printable UI.

Show strictly the label components.

Ensure page-break-after: always for each label.

Label Content:

Header: "DDS Warehouse"

Large QR Code: Generated using https://api.qrserver.com/v1/create-qr-code/?data={BinID}. Must encodeURIComponent the BinID.

Large Human-Readable Bin ID text.

Footer: "SCAN TO UPDATE STOCK".

5. UI/UX Design System

Color Palette: Slate (Backgrounds/Text), Blue (Primary Actions), Emerald (Success), Amber (Warning/Dummy Data), Rose (Danger/Full).

Components:

Card: White background, rounded corners, subtle shadow.

Badge: Pill-shaped, colored background with darker text.

Navbar: Sticky top, clean white.

Responsiveness: Grid system must adapt from mobile (1 col) to tablet (2-3 cols) to desktop (4-6 cols).

6. Implementation Notes for AI Agent

Ensure all logic is contained within App.jsx (or structured appropriately).

Fix for Printing: Place the <PrintableLabels /> component outside the main content div or ensure it's not hidden by parent containers when print:hidden is applied to the UI. Use a fixed overlay technique for the print view.