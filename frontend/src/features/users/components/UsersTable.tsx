import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import {
  Button,
  Chip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type { UserRecord } from '@/features/users/types/usersPage.types';

import { getTablePaperSx } from './usersPage.styles';

interface UsersTableProps {
  canManageUsers: boolean;
  onDeleteUser: (userId: string) => void | Promise<void>;
  onEditUser: (user: UserRecord) => void;
  rows: UserRecord[];
}

const UsersTable = ({
  canManageUsers,
  onDeleteUser,
  onEditUser,
  rows,
}: UsersTableProps) => {
  const theme = useTheme();

  return (
    <Box sx={getTablePaperSx()}>
      {rows.length === 0 ? (
        <Box
          sx={{
            borderRadius: 3,
            px: 3,
            py: 6,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.background.paper, 0.78),
            boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            No users match these filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try a wider search or clear the selected role filters.
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            ...getTablePaperSx(),
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.background.paper, 0.86),
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.05)}`,
            overflowX: 'auto',
          }}
        >
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                {['User', 'Role', 'Manager', 'Last updated', 'Actions'].map((label) => (
                  <TableCell
                    key={label}
                    sx={{
                      py: 1.4,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{
                    '&:last-child td': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  <TableCell sx={{ py: 1.5, minWidth: 220 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700 }}>{user.displayName}</Typography>
                        {user.isSelf ? (
                          <Chip
                            size="small"
                            icon={<ShieldRoundedIcon />}
                            label="You"
                            sx={{ height: 22, borderRadius: 1.25 }}
                          />
                        ) : null}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ py: 1.5, minWidth: 150 }}>
                    <Chip
                      size="small"
                      label={user.role.label}
                      color={user.role.name === 'administrator' ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{
                        height: 24,
                        borderRadius: 1.25,
                        backgroundColor:
                          user.role.name === 'administrator'
                            ? alpha(theme.palette.primary.light, 0.06)
                            : alpha(theme.palette.common.black, 0.02),
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ py: 1.5, minWidth: 170 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.manager?.displayName ?? 'Not assigned'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.5, minWidth: 140 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {new Date(user.updatedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ py: 1.5, minWidth: 220 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="outlined"
                        onClick={() => onEditUser(user)}
                        sx={{
                          minWidth: 0,
                          minHeight: 32,
                          px: 1.25,
                          py: 0.4,
                          fontSize: '0.83rem',
                          fontWeight: 600,
                          borderRadius: 1.5,
                        }}
                      >
                        <EditRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                        Edit
                      </Button>

                      {canManageUsers && !user.isSelf ? (
                        <Button
                          color="inherit"
                          onClick={() => {
                            void onDeleteUser(user.id);
                          }}
                          sx={{
                            minWidth: 0,
                            minHeight: 32,
                            px: 1.25,
                            py: 0.4,
                            fontSize: '0.83rem',
                            fontWeight: 600,
                            borderRadius: 1.5,
                          }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                          Delete
                        </Button>
                      ) : null}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default UsersTable;
