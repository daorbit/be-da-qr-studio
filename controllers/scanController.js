import Scan from '../models/Scan.js';
import QRCode from '../models/QRCode.js';

// @desc    Get all scans for a QR code
// @route   GET /api/qrcodes/:id/scans
// @access  Private
export const getQRCodeScans = async (req, res) => {
  try {
    const qrCode = await QRCode.findById(req.params.id);

    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'QR code not found' });
    }

    // Make sure user owns this QR code
    if (qrCode.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const scans = await Scan.find({ qrCode: req.params.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: scans.length,
      scans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get aggregated analytics for current user across all QR codes
// @route   GET /api/scans/analytics
// @access  Private
export const getUserAnalytics = async (req, res) => {
  try {
    // Get user's QR codes
    const qrCodes = await QRCode.find({ user: req.user._id }).select('_id name');
    const qrCodeIds = qrCodes.map(qr => qr._id);

    if (qrCodeIds.length === 0) {
      return res.json({ success: true, totalScans: 0, analytics: { browsers: {}, os: {}, devices: {}, countries: {}, scansByDate: {}, topQRCodes: [] } });
    }

    // Total scans
    const totalScans = await Scan.countDocuments({ qrCode: { $in: qrCodeIds } });

    // Aggregate browsers
    const browsersAgg = await Scan.aggregate([
      { $match: { qrCode: { $in: qrCodeIds } } },
      { $group: { _id: '$browser.name', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]);

    // Aggregate OS
    const osAgg = await Scan.aggregate([
      { $match: { qrCode: { $in: qrCodeIds } } },
      { $group: { _id: '$os.name', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]);

    // Devices
    const devicesAgg = await Scan.aggregate([
      { $match: { qrCode: { $in: qrCodeIds } } },
      { $group: { _id: '$device.type', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]);

    // Countries
    const countriesAgg = await Scan.aggregate([
      { $match: { qrCode: { $in: qrCodeIds } } },
      { $group: { _id: '$location.country', count: { $sum: 1 } } },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]);

    // Scans by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const scansByDateAgg = await Scan.aggregate([
      { $match: { qrCode: { $in: qrCodeIds }, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
      { $sort: { date: 1 } },
    ]);

    // Top QR codes
    const topQRAgg = await Scan.aggregate([
      { $match: { qrCode: { $in: qrCodeIds } } },
      { $group: { _id: '$qrCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'qrcodes', localField: '_id', foreignField: '_id', as: 'qr' } },
      { $unwind: { path: '$qr', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, qrCodeId: '$_id', name: '$qr.name', count: 1 } },
    ]);

    // Convert arrays to objects where sensible
    const browsers = browsersAgg.reduce((acc, b) => { if (b.name) acc[b.name] = b.count; return acc; }, {});
    const os = osAgg.reduce((acc, o) => { if (o.name) acc[o.name] = o.count; return acc; }, {});
    const devices = devicesAgg.reduce((acc, d) => { if (d.name) acc[d.name] = d.count; return acc; }, {});
    const countries = countriesAgg.reduce((acc, c) => { if (c.name) acc[c.name] = c.count; return acc; }, {});
    const scansByDate = scansByDateAgg.reduce((acc, d) => { if (d.date) acc[d.date] = d.count; return acc; }, {});

    res.json({
      success: true,
      totalScans,
      analytics: {
        browsers,
        os,
        devices,
        countries,
        scansByDate,
        topQRCodes: topQRAgg,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get scan analytics for a QR code
// @route   GET /api/qrcodes/:id/analytics
// @access  Private
export const getQRCodeAnalytics = async (req, res) => {
  try {
    const qrCode = await QRCode.findById(req.params.id);

    if (!qrCode) {
      return res.status(404).json({ success: false, message: 'QR code not found' });
    }

    // Make sure user owns this QR code
    if (qrCode.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const scans = await Scan.find({ qrCode: req.params.id });

    // Analytics by browser
    const browserStats = scans.reduce((acc, scan) => {
      const browser = scan.browser?.name || 'Unknown';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {});

    // Analytics by OS
    const osStats = scans.reduce((acc, scan) => {
      const os = scan.os?.name || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {});

    // Analytics by device type
    const deviceStats = scans.reduce((acc, scan) => {
      const device = scan.device?.type || 'desktop';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    // Analytics by country
    const countryStats = scans.reduce((acc, scan) => {
      const country = scan.location?.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    // Analytics by date (last 30 days)
    const dateStats = scans.reduce((acc, scan) => {
      const date = new Date(scan.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      totalScans: scans.length,
      analytics: {
        browsers: browserStats,
        os: osStats,
        devices: deviceStats,
        countries: countryStats,
        scansByDate: dateStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all scans for current user (all QR codes)
// @route   GET /api/scans
// @access  Private
export const getUserScans = async (req, res) => {
  try {
    // Get all QR codes owned by user
    const qrCodes = await QRCode.find({ user: req.user._id }).select('_id');
    const qrCodeIds = qrCodes.map(qr => qr._id);

    // Get all scans for those QR codes
    const scans = await Scan.find({ qrCode: { $in: qrCodeIds } })
      .sort({ createdAt: -1 })
      // populate QR code name so frontend can show which QR code a scan belongs to
      .populate('qrCode', 'name type content')
      .limit(100); // Limit to last 100 scans

    res.json({
      success: true,
      count: scans.length,
      scans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
