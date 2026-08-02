import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import EmptyState from '../common/EmptyState';
import LoadingState from '../common/LoadingState';

const valueFor = (column, row) => column.render ? column.render(row) : row[column.key];

const ResponsiveRecordTable = ({ rows, columns, loading, emptyTitle, emptyDescription, rowKey = 'id', mobileTitle, mobileSubtitle, mobileActions }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));

  if (loading) return <LoadingState />;
  if (!rows?.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  if (mobile) {
    return (
      <Stack spacing={1.5}>
        {rows.map((row) => (
          <Card key={row[rowKey]} sx={{ boxShadow: 'none' }}>
            <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
                    {mobileTitle ? mobileTitle(row) : valueFor(columns[0], row)}
                  </Typography>
                  {mobileSubtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{mobileSubtitle(row)}</Typography>}
                </Box>
                {mobileActions && <Box sx={{ flexShrink: 0 }}>{mobileActions(row)}</Box>}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.4 }}>
                {columns.filter((column) => !column.mobileHidden && column.key !== 'actions').slice(1).map((column) => (
                  <Box key={column.key} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{column.label}</Typography>
                    <Box sx={{ mt: 0.2, fontSize: '.9rem', overflowWrap: 'anywhere' }}>{valueFor(column, row) ?? '—'}</Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => <TableCell key={column.key} align={column.align || 'left'}>{column.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row[rowKey]} hover>
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align || 'left'} sx={{ py: 1.4, whiteSpace: column.nowrap ? 'nowrap' : 'normal' }}>
                  {valueFor(column, row) ?? '—'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResponsiveRecordTable;
