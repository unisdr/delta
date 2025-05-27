import winston from "winston";
import 'winston-daily-rotate-file';

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/dts-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '5m',
  maxFiles: '14d',
});

const createLogger = (module: string = "") => {
  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format((info) => {
        info.module = module; 
        return info;
      })(),
      winston.format.json()
    ),
    transports: [
      transport,
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, module }) => {
            const moduleStr = module ? `[${module}]` : '';
            return `${level}: ${message} ${moduleStr} ${timestamp}`;
          })
        ),
      }),
    ],
  });
};

export default createLogger;