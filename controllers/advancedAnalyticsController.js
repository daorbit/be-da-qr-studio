import Scan from '../models/Scan.js';
import QRCode from '../models/QRCode.js';

// @desc    Get all advanced analytics in one call
// @route   GET /api/scans/analytics/advanced/:id?
// @access  Private
export const getAllAdvancedAnalytics = async (req, res) => {
  try {
    const qrCodeId = req.params.id;
    let query = {};

    if (qrCodeId) {
      const qrCode = await QRCode.findById(qrCodeId);
      if (!qrCode || qrCode.user.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: 'QR code not found' });
      }
      query = { qrCode: qrCodeId };
    } else {
      const qrCodes = await QRCode.find({ user: req.user._id }).select('_id');
      const qrCodeIds = qrCodes.map(qr => qr._id);
      query = { qrCode: { $in: qrCodeIds } };
    }

    // Get all scans for processing
    const scans = await Scan.find(query).select('ip location createdAt referrer').sort({ createdAt: 1 });

    // === HEATMAP DATA ===
    const scansWithCoordinates = scans.filter(s => s.location?.latitude && s.location?.longitude);
    const heatmapData = scansWithCoordinates.map(scan => ({
      lat: scan.location.latitude,
      lng: scan.location.longitude,
      city: scan.location.city,
      country: scan.location.country,
      timestamp: scan.createdAt,
    }));

    // Run aggregations in parallel for better performance
    const [cityStats, hourlyStats, dailyStats, heatmapMatrix] = await Promise.all([
      Scan.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              city: '$location.city',
              country: '$location.country',
              lat: '$location.latitude',
              lng: '$location.longitude',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 100 },
      ]),
      Scan.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Scan.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Scan.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              hour: { $hour: '$createdAt' },
              day: { $dayOfWeek: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.day': 1, '_id.hour': 1 } },
      ]),
    ]);

    const cityData = cityStats.map(stat => ({
      city: stat._id.city,
      country: stat._id.country,
      lat: stat._id.lat,
      lng: stat._id.lng,
      count: stat.count,
    }));

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyStats.find(s => s._id === i)?.count || 0,
    }));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyData = Array.from({ length: 7 }, (_, i) => ({
      day: dayNames[i],
      dayIndex: i,
      count: dailyStats.find(s => s._id === (i + 1))?.count || 0,
    }));

    const heatmapMatrixFormatted = heatmapMatrix.map(stat => ({
      hour: stat._id.hour,
      day: stat._id.day - 1,
      dayName: dayNames[stat._id.day - 1],
      count: stat.count,
    }));

    // === RETENTION DATA ===
    const ipFirstScan = new Map();
    const ipScanCount = new Map();

    scans.forEach(scan => {
      const ip = scan.ip;
      if (!ipFirstScan.has(ip)) {
        ipFirstScan.set(ip, scan.createdAt);
      }
      ipScanCount.set(ip, (ipScanCount.get(ip) || 0) + 1);
    });

    let newScans = 0;
    let returningScans = 0;

    scans.forEach(scan => {
      const ip = scan.ip;
      const firstScan = ipFirstScan.get(ip);
      if (scan.createdAt.getTime() === firstScan.getTime()) {
        newScans++;
      } else {
        returningScans++;
      }
    });

    const uniqueScanners = ipFirstScan.size;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Run remaining aggregations in parallel
    const [dailyRetention, referrerStats] = await Promise.all([
      Scan.aggregate([
        { $match: { ...query, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              ip: '$ip',
            },
          },
        },
        {
          $group: {
            _id: '$_id.date',
            uniqueUsers: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Scan.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$referrer',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    const repeatScanners = Array.from(ipScanCount.values()).filter(count => count > 1).length;
    const repeatRate = uniqueScanners > 0 ? (repeatScanners / uniqueScanners) * 100 : 0;

    const categorized = {
      direct: 0,
      social: 0,
      search: 0,
      email: 0,
      other: 0,
    };

    const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'youtube.com'];
    const searchDomains = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
    const emailDomains = ['mail.google.com', 'outlook.live.com', 'mail.yahoo.com'];

    referrerStats.forEach(stat => {
      const referrer = stat._id || '';
      const count = stat.count;

      if (!referrer || referrer === 'direct') {
        categorized.direct += count;
      } else if (socialDomains.some(domain => referrer.includes(domain))) {
        categorized.social += count;
      } else if (searchDomains.some(domain => referrer.includes(domain))) {
        categorized.search += count;
      } else if (emailDomains.some(domain => referrer.includes(domain))) {
        categorized.email += count;
      } else {
        categorized.other += count;
      }
    });

    // === COMBINED RESPONSE ===
    res.json({
      success: true,
      heatmap: {
        heatmapData,
        cityData,
        total: scansWithCoordinates.length,
      },
      peakTimes: {
        hourlyData,
        dailyData,
        heatmapMatrix: heatmapMatrixFormatted,
      },
      retention: {
        totalScans: scans.length,
        uniqueScanners,
        newScans,
        returningScans,
        repeatScanners,
        repeatRate: repeatRate.toFixed(2),
        dailyRetention: dailyRetention.map(d => ({
          date: d._id,
          uniqueUsers: d.uniqueUsers,
        })),
      },
      referrers: {
        referrers: referrerStats.map(s => ({
          referrer: s._id || 'Direct',
          count: s.count,
        })),
        categorized,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get geographic heatmap data
// @route   GET /api/scans/analytics/heatmap/:id?
// @access  Private
export const getHeatmapData = async (req, res) => {
  try {
    const qrCodeId = req.params.id;
    let query = {};

    if (qrCodeId) {
      // Specific QR code
      const qrCode = await QRCode.findById(qrCodeId);
      if (!qrCode || qrCode.user.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: 'QR code not found' });
      }
      query = { qrCode: qrCodeId };
    } else {
      // All user's QR codes
      const qrCodes = await QRCode.find({ user: req.user._id }).select('_id');
      const qrCodeIds = qrCodes.map(qr => qr._id);
      query = { qrCode: { $in: qrCodeIds } };
    }

    // Get scans with valid coordinates
    const scans = await Scan.find({
      ...query,
      'location.latitude': { $exists: true, $ne: null },
      'location.longitude': { $exists: true, $ne: null },
    }).select('location.latitude location.longitude location.city location.country createdAt');

    // Group by coordinates for intensity
    const heatmapData = scans.map(scan => ({
      lat: scan.location.latitude,
      lng: scan.location.longitude,
      city: scan.location.city,
      country: scan.location.country,
      timestamp: scan.createdAt,
    }));

    // City-level aggregation
    const cityStats = await Scan.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            city: '$location.city',
            country: '$location.country',
            lat: '$location.latitude',
            lng: '$location.longitude',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);

    const cityData = cityStats.map(stat => ({
      city: stat._id.city,
      country: stat._id.country,
      lat: stat._id.lat,
      lng: stat._id.lng,
      count: stat.count,
    }));

    res.json({
      success: true,
      heatmapData,
      cityData,
      total: scans.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get peak usage time analysis (hourly heatmap)
// @route   GET /api/scans/analytics/peak-times/:id?
// @access  Private
export const getPeakTimes = async (req, res) => {
  try {
    const qrCodeId = req.params.id;
    let query = {};

    if (qrCodeId) {
      const qrCode = await QRCode.findById(qrCodeId);
      if (!qrCode || qrCode.user.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: 'QR code not found' });
      }
      query = { qrCode: qrCodeId };
    } else {
      const qrCodes = await QRCode.find({ user: req.user._id }).select('_id');
      const qrCodeIds = qrCodes.map(qr => qr._id);
      query = { qrCode: { $in: qrCodeIds } };
    }

    // Hourly breakdown (0-23)
    const hourlyStats = await Scan.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Day of week breakdown (0=Sunday, 6=Saturday)
    const dailyStats = await Scan.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Hour x Day heatmap
    const heatmapStats = await Scan.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            day: { $dayOfWeek: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1, '_id.hour': 1 } },
    ]);

    // Format for frontend
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyStats.find(s => s._id === i)?.count || 0,
    }));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyData = Array.from({ length: 7 }, (_, i) => ({
      day: dayNames[i],
      dayIndex: i,
      count: dailyStats.find(s => s._id === (i + 1))?.count || 0, // MongoDB uses 1=Sunday
    }));

    const heatmapMatrix = heatmapStats.map(stat => ({
      hour: stat._id.hour,
      day: stat._id.day - 1, // Convert to 0-based
      dayName: dayNames[stat._id.day - 1],
      count: stat.count,
    }));

    res.json({
      success: true,
      hourlyData,
      dailyData,
      heatmapMatrix,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get retention analysis (new vs returning scanners)
// @route   GET /api/scans/analytics/retention/:id?
// @access  Private
export const getRetentionAnalysis = async (req, res) => {
  try {
    const qrCodeId = req.params.id;
    let query = {};

    if (qrCodeId) {
      const qrCode = await QRCode.findById(qrCodeId);
      if (!qrCode || qrCode.user.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: 'QR code not found' });
      }
      query = { qrCode: qrCodeId };
    } else {
      const qrCodes = await QRCode.find({ user: req.user._id }).select('_id');
      const qrCodeIds = qrCodes.map(qr => qr._id);
      query = { qrCode: { $in: qrCodeIds } };
    }

    // Get all scans
    const scans = await Scan.find(query).select('ip createdAt').sort({ createdAt: 1 });

    // Track first scan per IP
    const ipFirstScan = new Map();
    const ipScanCount = new Map();

    scans.forEach(scan => {
      const ip = scan.ip;
      if (!ipFirstScan.has(ip)) {
        ipFirstScan.set(ip, scan.createdAt);
      }
      ipScanCount.set(ip, (ipScanCount.get(ip) || 0) + 1);
    });

    // Count new vs returning
    let newScans = 0;
    let returningScans = 0;

    scans.forEach(scan => {
      const ip = scan.ip;
      const firstScan = ipFirstScan.get(ip);
      if (scan.createdAt.getTime() === firstScan.getTime()) {
        newScans++;
      } else {
        returningScans++;
      }
    });

    // Unique scanners
    const uniqueScanners = ipFirstScan.size;

    // Retention by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRetention = await Scan.aggregate([
      { $match: { ...query, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            ip: '$ip',
          },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          uniqueUsers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate repeat scan rate
    const repeatScanners = Array.from(ipScanCount.values()).filter(count => count > 1).length;
    const repeatRate = uniqueScanners > 0 ? (repeatScanners / uniqueScanners) * 100 : 0;

    res.json({
      success: true,
      totalScans: scans.length,
      uniqueScanners,
      newScans,
      returningScans,
      repeatScanners,
      repeatRate: repeatRate.toFixed(2),
      dailyRetention: dailyRetention.map(d => ({
        date: d._id,
        uniqueUsers: d.uniqueUsers,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get referrer source tracking
// @route   GET /api/scans/analytics/referrers/:id?
// @access  Private
export const getReferrerAnalysis = async (req, res) => {
  try {
    const qrCodeId = req.params.id;
    let query = {};

    if (qrCodeId) {
      const qrCode = await QRCode.findById(qrCodeId);
      if (!qrCode || qrCode.user.toString() !== req.user._id.toString()) {
        return res.status(404).json({ success: false, message: 'QR code not found' });
      }
      query = { qrCode: qrCodeId };
    } else {
      const qrCodes = await QRCode.find({ user: req.user._id }).select('_id');
      const qrCodeIds = qrCodes.map(qr => qr._id);
      query = { qrCode: { $in: qrCodeIds } };
    }

    // Aggregate by referrer
    const referrerStats = await Scan.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Categorize referrers
    const categorized = {
      direct: 0,
      social: 0,
      search: 0,
      email: 0,
      other: 0,
    };

    const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com', 'youtube.com'];
    const searchDomains = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com'];
    const emailDomains = ['mail.google.com', 'outlook.live.com', 'mail.yahoo.com'];

    referrerStats.forEach(stat => {
      const referrer = stat._id || '';
      const count = stat.count;

      if (!referrer || referrer === 'direct') {
        categorized.direct += count;
      } else if (socialDomains.some(domain => referrer.includes(domain))) {
        categorized.social += count;
      } else if (searchDomains.some(domain => referrer.includes(domain))) {
        categorized.search += count;
      } else if (emailDomains.some(domain => referrer.includes(domain))) {
        categorized.email += count;
      } else {
        categorized.other += count;
      }
    });

    res.json({
      success: true,
      referrers: referrerStats.map(s => ({
        referrer: s._id || 'Direct',
        count: s.count,
      })),
      categorized,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
