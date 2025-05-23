import winston from 'winston';
import 'winston-daily-rotate-file';

// Factory function to create a logger with a specific file name
function createLogger(fileName: string) {
  const transport = new winston.transports.DailyRotateFile({
    filename: 'logs/dts-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '5m',
    maxFiles: '14d',
  });

  // Custom format to include fileName in the log
  const addFileName = winston.format((info) => {
    info.fileName = fileName;
    return info;
  });

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      addFileName(),
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      transport,
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, fileName }) => {
            return `${timestamp} [${level}] (${fileName}): ${message}`;
          })
        ),
      }),
    ],
  });
}

export default createLogger;