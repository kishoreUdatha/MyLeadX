export { default as collegeReducer } from './collegeSlice';
export { default as visitReducer } from './visitSlice';
export { default as dealReducer } from './dealSlice';
export { default as expenseReducer } from './expenseSlice';

// Re-export actions with prefixed names to avoid conflicts
export {
  clearError as clearCollegeError,
  clearCurrentCollege,
  setPage as setCollegePage,
  fetchColleges,
  fetchCollegeById,
  createCollege,
  updateCollege,
  deleteCollege,
  reassignCollege,
  fetchCollegeStats,
  fetchCities,
  fetchStates,
  addContact,
  updateContact,
  deleteContact,
} from './collegeSlice';

export {
  clearError as clearVisitError,
  clearCurrentVisit,
  setPage as setVisitPage,
  fetchVisits,
  fetchVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
  checkIn,
  checkOut,
  fetchOpenVisit,
  fetchVisitStats,
  fetchTodaySchedule,
} from './visitSlice';

export {
  clearError as clearDealError,
  clearCurrentDeal,
  setPage as setDealPage,
  fetchDeals,
  fetchDealById,
  fetchDealByCollegeId,
  createDeal,
  updateDeal,
  updateStage,
  deleteDeal,
  fetchPipeline,
  fetchDealStats,
  fetchRecentWins,
} from './dealSlice';

export {
  clearError as clearExpenseError,
  clearCurrentExpense,
  setPage as setExpensePage,
  fetchExpenses,
  fetchExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  submitMultipleExpenses,
  approveOrRejectExpense,
  bulkApprove,
  markAsPaid,
  fetchPendingApprovals,
  fetchExpenseStats,
  fetchMySummary,
  fetchCategoryLimits,
} from './expenseSlice';
