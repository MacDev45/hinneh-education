import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileX,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { getStatusBadgeColor } from '@/lib/index';
import { AppLogoLoader } from '@/components/AppLogoLoader';

export type Column<T = unknown> = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T, index?: number) => React.ReactNode;
};

interface DataTableProps {
  columns: Column[];
  data: unknown[];
  title?: string;
  searchable?: boolean;
  exportable?: boolean;
  loading?: boolean;
  onEdit?: (row: unknown) => void;
  onDelete?: (row: unknown) => void;
}

export function DataTable({
  columns,
  data,
  title,
  searchable = true,
  exportable = true,
  loading = false,
  onEdit,
  onDelete,
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    return data.filter((row) => {
      const rowData = row as Record<string, unknown>;
      return columns.some((col) => {
        const value = rowData[col.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  }, [data, searchQuery, columns]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aData = a as Record<string, unknown>;
      const bData = b as Record<string, unknown>;
      const aValue = aData[sortConfig.key];
      const bValue = bData[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortConfig.direction === 'asc'
        ? aStr.localeCompare(bStr, 'fr')
        : bStr.localeCompare(aStr, 'fr');
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const handleExport = () => {
    const headers = columns.map((col) => col.label).join(',');
    const rows = sortedData
      .map((row) => {
        const rowData = row as Record<string, unknown>;
        return columns
          .map((col) => {
            const value = rowData[col.key];
            if (value === null || value === undefined) return '';
            const strValue = String(value).replace(/"/g, '""');
            return `"${strValue}"`;
          })
          .join(',');
      })
      .join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const headersHTML = columns.map((col) => `<th style="background-color: #166534; color: white;">${col.label}</th>`).join('');
    const rowsHTML = sortedData
      .map((row) => {
        const rowData = row as Record<string, unknown>;
        const cells = columns
          .map((col) => {
            const value = rowData[col.key];
            if (value === null || value === undefined) return '<td>-</td>';
            return `<td>${String(value)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${title || 'Donnees'}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>${title || 'TABLEAU SYNTHÉTIQUE DES ARRIÉRÉS ÉLÈVES'} - GROUPE SCOLAIRE HÎNNEH</h2>
        <table border="1"><thead><tr>${headersHTML}</tr></thead><tbody>${rowsHTML}</tbody></table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `export_${title ? title.toLowerCase().replace(/\s+/g, '_') : 'table'}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const headersHTML = columns.map((col) => `<th>${col.label}</th>`).join('');
    const rowsHTML = sortedData
      .map((row) => {
        const rowData = row as Record<string, unknown>;
        const cells = columns
          .map((col) => {
            const value = rowData[col.key];
            if (value === null || value === undefined) return '<td>-</td>';
            return `<td>${String(value)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${title || 'Tableau Synthétique des Arriérés'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #0f172a; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; }
          .logo { height: 50px; margin-bottom: 5px; }
          h2 { text-transform: uppercase; color: #1e3a8a; font-size: 16px; margin: 0; font-weight: 900; }
          p.sub { font-size: 11px; color: #64748b; margin: 4px 0 0 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th { background: #1e3a8a; color: white; padding: 7px; text-align: left; font-size: 10px; text-transform: uppercase; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .footer-date { margin-top: 25px; text-align: right; font-size: 10px; color: #64748b; font-style: italic; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://hinneh-education.ci/images/hinneh_logo_20260507_234919.png" class="logo" alt="Logo" />
          <h2>GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH</h2>
          <p class="sub">${title || 'TABLEAU SYNTHÉTIQUE DES ARRIÉRÉS ÉLÈVES (ÉCHÉANCIERS)'} — Extrait du ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table>
          <thead>
            <tr>${headersHTML}</tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        <div class="footer-date">Document édité le ${new Date().toLocaleDateString('fr-FR')} — Hînneh Éducation App</div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  const renderCellContent = (column: Column, row: unknown) => {
    const rowData = row as Record<string, unknown>;
    const value = rowData[column.key];

    if (column.render) {
      return column.render(value, row);
    }

    if (column.key.toLowerCase().includes('status') || column.key.toLowerCase().includes('statut')) {
      return (
        <Badge variant={getStatusBadgeColor(String(value))}>
          {String(value).replace(/_/g, ' ')}
        </Badge>
      );
    }

    if (value === null || value === undefined) return '-';
    return String(value);
  };

  if (loading) {
    return (
      <div className="space-y-4 min-h-[360px] flex flex-col justify-center items-center py-12 rounded-xl border border-slate-200/80 bg-white/60 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm backdrop-blur-sm">
        <AppLogoLoader
          size="md"
          title={title || "GROUPE SCOLAIRE CONFESSIONNEL HÎNNEH"}
          message="Chargement des données du tableau..."
          submessage="Veuillez patienter pendant la récupération des enregistrements"
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        {title && <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileX className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune donnée disponible</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Il n'y a actuellement aucune donnée à afficher. Les données apparaîtront ici une fois
              qu'elles seront disponibles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {searchable && (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        )}

        {exportable && (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExportExcel} variant="outline" size="sm" className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Exporter Excel
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold">
              <FileText className="h-4 w-4 text-indigo-600" />
              Exporter PDF
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="gap-1 font-bold">
              <Download className="h-4 w-4 text-slate-600" />
              Exporter CSV
            </Button>
          </div>
        )}
      </div>

      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="flex items-center font-semibold hover:text-foreground transition-colors"
                    >
                      {column.label}
                      {renderSortIcon(column.key)}
                    </button>
                  ) : (
                    <span className="font-semibold">{column.label}</span>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-[80px]">
                <span className="font-semibold">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, index) => {
              const rowData = row as Record<string, unknown>;
              const rowId = rowData.id || rowData.matricule || index;
              const hasClick = typeof rowData.onClick === 'function';
              const handleRowClick = (e: React.MouseEvent) => {
                if ((e.target as HTMLElement).closest('button')) {
                  return;
                }
                if (hasClick) {
                  (rowData.onClick as () => void)();
                }
              };
              return (
                <TableRow 
                  key={String(rowId)} 
                  onClick={handleRowClick}
                  className={hasClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>{renderCellContent(column, row)}</TableCell>
                  ))}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { if (hasClick) (rowData.onClick as () => void)(); }}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </DropdownMenuItem>
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(row)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDelete(row)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {paginatedData.map((row, index) => {
          const rowData = row as Record<string, unknown>;
          const rowId = rowData.id || rowData.matricule || index;
          return (
            <Card key={String(rowId)}>
              <CardContent className="p-4 space-y-3">
                {columns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">
                      {column.label}
                    </span>
                    <span className="text-sm text-right">{renderCellContent(column, row)}</span>
                  </div>
                ))}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      if (typeof rowData.onClick === 'function') {
                        (rowData.onClick as () => void)();
                      }
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Voir
                  </Button>
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onEdit(row)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Lignes par page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
