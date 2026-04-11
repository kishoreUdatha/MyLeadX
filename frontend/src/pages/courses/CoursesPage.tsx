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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

interface Course {
  id: string;
  name: string;
  code: string;
  department: string;
  duration: string;
  fee: number;
  seats: number;
  enrolledCount: number;
  status: 'active' | 'inactive';
}

const mockCourses: Course[] = [
  { id: '1', name: 'Bachelor of Technology', code: 'BTECH', department: 'Engineering', duration: '4 Years', fee: 150000, seats: 120, enrolledCount: 98, status: 'active' },
  { id: '2', name: 'Master of Business Administration', code: 'MBA', department: 'Management', duration: '2 Years', fee: 200000, seats: 60, enrolledCount: 55, status: 'active' },
  { id: '3', name: 'Bachelor of Commerce', code: 'BCOM', department: 'Commerce', duration: '3 Years', fee: 50000, seats: 100, enrolledCount: 87, status: 'active' },
  { id: '4', name: 'Master of Computer Applications', code: 'MCA', department: 'Computer Science', duration: '2 Years', fee: 120000, seats: 40, enrolledCount: 32, status: 'active' },
  { id: '5', name: 'Bachelor of Arts', code: 'BA', department: 'Arts', duration: '3 Years', fee: 30000, seats: 80, enrolledCount: 45, status: 'inactive' },
];

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [courses] = useState<Course[]>(mockCourses);
  const [openDialog, setOpenDialog] = useState(false);

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(search.toLowerCase()) ||
    course.code.toLowerCase().includes(search.toLowerCase()) ||
    course.department.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={600}>Courses</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage courses and programs offered by your institution
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Add Course
        </Button>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search courses by name, code, or department..."
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

      {/* Courses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Course Name</strong></TableCell>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Department</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell align="right"><strong>Fee</strong></TableCell>
              <TableCell align="center"><strong>Seats</strong></TableCell>
              <TableCell align="center"><strong>Enrolled</strong></TableCell>
              <TableCell align="center"><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCourses.map((course) => (
              <TableRow key={course.id} hover>
                <TableCell>
                  <Typography fontWeight={500}>{course.name}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={course.code} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{course.department}</TableCell>
                <TableCell>{course.duration}</TableCell>
                <TableCell align="right">{formatCurrency(course.fee)}</TableCell>
                <TableCell align="center">{course.seats}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${course.enrolledCount}/${course.seats}`}
                    size="small"
                    color={course.enrolledCount >= course.seats ? 'error' : 'success'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={course.status}
                    size="small"
                    color={course.status === 'active' ? 'success' : 'default'}
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

      {/* Add Course Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Course</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Course Name" fullWidth required />
            <TextField label="Course Code" fullWidth required />
            <TextField label="Department" fullWidth required />
            <TextField label="Duration" fullWidth placeholder="e.g., 4 Years" />
            <TextField label="Fee (INR)" fullWidth type="number" />
            <TextField label="Total Seats" fullWidth type="number" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Add Course</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
