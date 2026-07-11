const GlobalSearchService = require('../services/GlobalSearchService');
const { sendResponse } = require('../utils/apiResponse');

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await GlobalSearchService.search(q, req.user.id);
    sendResponse(res, 200, 'Search completed', results);
  } catch (error) {
    next(error);
  }
};
