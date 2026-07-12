// Every Observatory chart ships a data-table twin (SPEC-stats-dashboard §2:
// "View as table", shadcn Table collapsed) - screen readers and keyboard
// users get the real numbers without tabbing through marks. The table stays
// in the DOM behind the `hidden` attribute (not conditional render): the
// content is assertable in static markup and the toggle is plain state - no
// Radix, so no new browser-loop idiom (UI-SYSTEM §16 H7).

import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

type CollapsedTableProps = {
  /** Stable element id for aria-controls (e.g. "observatory-scatter-table"). */
  tableId: string;
  caption: string;
  columns: readonly string[];
  rows: ReactNode[][];
};

export function CollapsedTable({
  tableId,
  caption,
  columns,
  rows,
}: CollapsedTableProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="chart-table-twin">
      <Button
        variant="ghost"
        size="sm"
        type="button"
        aria-expanded={open}
        aria-controls={tableId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Hide table" : "View as table"}
      </Button>
      <div id={tableId} hidden={!open}>
        <Table>
          <TableCaption>{caption}</TableCaption>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
