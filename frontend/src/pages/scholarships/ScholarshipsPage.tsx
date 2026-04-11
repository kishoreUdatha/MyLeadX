import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as TrophyIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';

interface Scholarship {
  id: string;
  name: string;
  type: 'merit' | 'need-based' | 'sports' | 'minority' | 'special';
  amount: number;
  percentage?: number;
  eligibility: string;
  beneficiaries: number;
  totalDisbursed: number;
  status: 'active' | 'inactive';
}

interface ScholarshipRecipient {
  id: string;
  studentName: string;
  studentId: string;
  course: string;
  scholarshipName: string;
  amount: number;
  awardedDate: string;
  status: 'approved' | 'pending' | 'disbursed';
}

const mockScholarships: Scholarship[] = [
  { id: '1', name: 'Merit Scholarship', type: 'merit', amount: 50000, eligibility: 'Above 90% in previous exam', beneficiaries: 45, totalDisbursed: 2250000, status: 'active' },
  { id: '2', name: 'Need-Based Aid', type: 'need-based', percentage: 50, amount: 0, eligibility: 'Family income < 3 LPA', beneficiaries: 120, totalDisbursed: 4500000, status: 'active' },
  { id: '3', name: 'Sports Excellence', type: 'sports', amount: 75000, eligibility: 'State/National level athletes', beneficiaries: 15, totalDisbursed: 1125000, status: 'active' },
  { id: '4', name: 'Minority Scholarship', type: 'minority', percentage: 25, amount: 0, eligibility: 'Minority community students', beneficiaries: 80, totalDisbursed: 1600000, status: 'active' },
  { id: '5', name: "Director's Special Award", type: 'special', amount: 100000, eligibility: 'Exceptional achievements', beneficiaries: 5, totalDisbursed: 500000, status: 'active' },
];

const mockRecipients: ScholarshipRecipient[] = [
  { id: '1', studentName: 'Ananya Krishnan', studentId: 'STU101', course: 'B.Tech CSE', scholarshipName: 'Merit Scholarship', amount: 50000, awardedDate: '2024-07-15', status: 'disbursed' },
  { id: '2', studentName: 'Mohammed Faisal', studentId: 'STU102', course: 'MBA', scholarshipName: 'Need-Based Aid', amount: 100000, awardedDate: '2024-07-20', status: 'disbursed' },
  { id: '3', studentName: 'Priya Sharma', studentId: 'STU103', course: 'B.Tech ECE', scholarshipName: 'Sports Excellence', amount: 75000, awardedDate: '2024-08-01', status: 'approved' },
  { id: '4', studentName: 'Raj Patel', studentId: 'STU104', course: 'B.Com', scholarshipName: 'Merit Scholarship', amount: 50000, awardedDate: '2024-08-10', status: 'pending' },
];

const stats = {
  totalScholarships: 12,
  totalBeneficiaries: 265,
  totalDisbursed: 9975000,
  pendingApplications: 34,
};

export default function ScholarshipsPage() {
  const [search, setSearch] = useState('');
  const [scholarships] = useState<Scholarship[]>(mockScholarships);
  const [recipients] = useState<ScholarshipRecipient[]>(mockRecipients);
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'scholarships' | 'recipients'>('scholarships');

  const filteredScholarships = scholarships.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRecipients = recipients.filter(r =>
    r.studentName.toLowerCase().includes(search.toLowerCase()) ||
    r.studentId.toLowerCase().includes(search.toLowerCase()) ||
    r.scholarshipName.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'merit': return 'primary';
      case 'need-based': return 'success';
      case 'sports': return 'warning';
      case 'minority': return 'info';
      case 'special': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disbursed': return 'success';
      case 'approved': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrophyIcon sx={{ fontSize: 32, color: 'warning.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={600}>Scholarships</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage scholarship programs and track recipients
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Add Scholarship
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SchoolIcon color="primary" />
                <Typography variant="body2" color="text.secondary">Total Scholarships</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>{stats.totalScholarships}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PeopleIcon color="success" />
                <Typography variant="body2" color="text.secondary">Total Beneficiaries</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>{stats.totalBeneficiaries}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MoneyIcon color="warning" />
                <Typography variant="body2" color="text.secondary">Total Disbursed</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>{formatCurrency(stats.totalDisbursed)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrophyIcon color="info" />
                <Typography variant="body2" color="text.secondary">Pending Applications</Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>{stats.pendingApplications}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant={activeTab === 'scholarships' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('scholarships')}
        >
          Scholarship Programs
        </Button>
        <Button
          variant={activeTab === 'recipients' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('recipients')}
        >
          Recipients
        </Button>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={activeTab === 'scholarships' ? "Search scholarships..." : "Search recipients..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Scholarships Table */}
      {activeTab === 'scholarships' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><strong>Scholarship Name</strong></TableCell>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell align="right"><strong>Amount/Percentage</strong></TableCell>
                <TableCell><strong>Eligibility</strong></TableCell>
                <TableCell align="center"><strong>Beneficiaries</strong></TableCell>
                <TableCell align="right"><strong>Total Disbursed</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScholarships.map((scholarship) => (
                <TableRow key={scholarship.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'warning.light', width: 32, height: 32 }}>
                        <TrophyIcon sx={{ fontSize: 18, color: 'warning.dark' }} />
                      </Avatar>
                      <Typography fontWeight={500}>{scholarship.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={scholarship.type.replace('-', ' ')}
                      size="small"
                      color={getTypeColor(scholarship.type) as any}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {scholarship.percentage
                      ? `${scholarship.percentage}% of fee`
                      : formatCurrency(scholarship.amount)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={scholarship.eligibility}>
                      {scholarship.eligibility}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{scholarship.beneficiaries}</TableCell>
                  <TableCell align="right">{formatCurrency(scholarship.totalDisbursed)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={scholarship.status}
                      size="small"
                      color={scholarship.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Recipients Table */}
      {activeTab === 'recipients' && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><strong>Student Name</strong></TableCell>
                <TableCell><strong>Student ID</strong></TableCell>
                <TableCell><strong>Course</strong></TableCell>
                <TableCell><strong>Scholarship</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
                <TableCell align="center"><strong>Awarded Date</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecipients.map((recipient) => (
                <TableRow key={recipient.id} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{recipient.studentName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={recipient.studentId} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{recipient.course}</TableCell>
                  <TableCell>{recipient.scholarshipName}</TableCell>
                  <TableCell align="right">{formatCurrency(recipient.amount)}</TableCell>
                  <TableCell align="center">{recipient.awardedDate}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={recipient.status.charAt(0).toUpperCase() + recipient.status.slice(1)}
                      size="small"
                      color={getStatusColor(recipient.status) as any}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Scholarship Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Scholarship</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Scholarship Name" fullWidth required />
            <TextField label="Type" fullWidth select required>
              <MenuItem value="merit">Merit Based</MenuItem>
              <MenuItem value="need-based">Need Based</MenuItem>
              <MenuItem value="sports">Sports</MenuItem>
              <MenuItem value="minority">Minority</MenuItem>
              <MenuItem value="special">Special</MenuItem>
            </TextField>
            <TextField label="Amount (INR)" fullWidth type="number" />
            <TextField label="Or Percentage (%)" fullWidth type="number" />
            <TextField label="Eligibility Criteria" fullWidth multiline rows={2} required />
            <TextField label="Maximum Recipients" fullWidth type="number" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Add Scholarship</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
