export interface ProgressBarProps {
  percentage: number;
  height?: number;
  showText?: boolean;
  color?: "blue" | "green" | "red" | "yellow";
  animated?: boolean;
  className?: string;
}

const colorClasses = {
  blue: "bg-blue-600",
  green: "bg-green-600",
  red: "bg-red-600",
  yellow: "bg-yellow-600",
};

export function ProgressBar({
  percentage,
  height = 8,
  showText = false,
  color = "blue",
  animated = true,
  className = "",
}: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className={`w-full ${className}`}>
      {showText && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">
            {clampedPercentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className={`h-full ${
            colorClasses[color]
          } transition-all duration-300 ease-out ${
            animated ? "progress-bar-animated" : ""
          }`}
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={clampedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
