import {
  Box,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { formatCompactDuration } from '@/features/timer/utils';
import type { UserActivityRow } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<number, string> = {
  1: 'User',
  2: 'Report Viewer',
  3: 'Manager',
  4: 'Administrator',
};

const formatLastEntry = (isoDate: string | null): string => {
  if (!isoDate) return '—';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const BillableBadge = ({
  billable,
  nonBillable,
}: {
  billable: number;
  nonBillable: number;
}) => {
  const total = billable + nonBillable;
  if (total === 0) return <Typography variant="caption" color="text.disabled">—</Typography>;
  const pct = Math.round((billable / total) * 100);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box
        sx={{
          width: 48,
          height: 6,
          borderRadius: 3,
          bgcolor: 'action.hover',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            bgcolor: 'primary.main',
            borderRadius: 3,
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {pct}%
      </Typography>
    </Box>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

interface OrgActivityTabProps {
  isLoading: boolean;
  rows: UserActivityRow[];
}

export const OrgActivityTab = ({ isLoading, rows }: OrgActivityTabProps) => {
  if (!isLoading && rows.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No activity logged in this period.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>User</TableCell>
            <TableCell>Role</TableCell>
            <TableCell align="right">Projects</TableCell>
            <TableCell align="right">Sessions</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell align="right">Billable</TableCell>
            <TableCell align="right">Non-Billable</TableCell>
            <TableCell>Billable %</TableCell>
            <TableCell>Last Entry</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow key={row.user_id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {row.display_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABEL[row.role_id] ?? `Role ${row.role_id}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell align="right">{row.active_projects}</TableCell>
                  <TableCell align="right">{row.entry_count}</TableCell>
                  <TableCell align="right">
                    {row.actual_duration > 0
                      ? formatCompactDuration(row.actual_duration)
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {row.billable_duration > 0
                      ? formatCompactDuration(row.billable_duration)
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {row.non_billable_duration > 0
                      ? formatCompactDuration(row.non_billable_duration)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <BillableBadge
                      billable={row.billable_duration}
                      nonBillable={row.non_billable_duration}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatLastEntry(row.last_entry_date)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </Box>
  );
};
