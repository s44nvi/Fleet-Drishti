import { useNavigate } from "react-router-dom";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "./Table";
import type { DataTableColumn } from "../../types";

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  getRowHref?: (row: T) => string | undefined;
  emptyLabel?: string;
}

// Generic list view built on the Table primitives. Pass a row-to-href
// mapper to make rows clickable (e.g. an issue row linking to its detail
// page) — every list screen in the app should render through this instead
// of hand-rolling its own <table>.
export function DataTable<T>({ columns, rows, getRowKey, getRowHref, emptyLabel = "No records." }: DataTableProps<T>) {
  const navigate = useNavigate();

  if (rows.length === 0) {
    return <div className="py-10 text-center text-body text-ink-3">{emptyLabel}</div>;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableHeaderCell key={column.key} className={column.align === "right" ? "text-right" : undefined}>
              {column.header}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const href = getRowHref?.(row);
          return (
            <TableRow
              key={getRowKey(row)}
              onClick={href ? () => navigate(href) : undefined}
              className={href ? "cursor-pointer hover:bg-surface-2 transition-colors duration-150" : undefined}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.align === "right" ? "text-right" : undefined}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
