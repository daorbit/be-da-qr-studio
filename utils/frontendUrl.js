export const frontendBase = () => (process.env.FRONTEND_URL || 'https://qrstudio.daorbit.in').trim().replace(/\/+$/, '');
