const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 96;
const LABEL_START = 88;
const LABEL_SPACE = 66;

const point = (angle, radius) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
};

const slicePath = (start, end) => {
  const [x0, y0] = point(start, RADIUS);
  const [x1, y1] = point(end, RADIUS);
  return `M${CENTER},${CENTER} L${x0},${y0} A${RADIUS},${RADIUS} 0 ${end - start > 180 ? 1 : 0} 1 ${x1},${y1} Z`;
};

// Deux couleurs en alternance ; une troisième évite deux cases vertes côte à côte quand leur nombre est impair.
const sliceTheme = (index, count) => {
  if (count % 2 === 1 && index === count - 1 && count > 1) return { fill: '#ffcf15', text: '#0f1822' };
  return index % 2 === 0 ? { fill: '#156c53', text: '#ffffff' } : { fill: '#ffffff', text: '#156c53' };
};

const MAX_LINE = 14;

const clip = (line) => (line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1)}…` : line);

// Coupe un texte long en deux lignes équilibrées, au mot le plus proche du milieu.
const toLines = (label) => {
  if (label.length <= 11 || !label.includes(' ')) return [clip(label)];
  const spaces = [...label.matchAll(/ /g)].map((match) => match.index);
  const cut = spaces.reduce((best, index) => (Math.abs(index - label.length / 2) < Math.abs(best - label.length / 2) ? index : best));
  return [clip(label.slice(0, cut)), clip(label.slice(cut + 1))];
};

// La rotation est appliquée directement sur le disque (discRef) image par image, sans repasser par React.
export default function WheelOfFortune({ segments, discRef }) {
  const count = segments.length;
  const slice = count ? 360 / count : 360;
  const baseFont = count <= 6 ? 10 : count <= 10 ? 8.5 : count <= 14 ? 7.2 : 6.2;

  return (
    <div className="wheel">
      <span className="wheel-pointer" aria-hidden="true" />
      <svg
        ref={discRef}
        className="wheel-disc"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={segments.map((segment) => segment.label).join(', ')}
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 3} fill="#0f1822" />
        {count === 1 && <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#156c53" />}
        {segments.map((segment, index) => {
          const theme = sliceTheme(index, count);
          const middle = (index + 0.5) * slice;
          const lines = toLines(segment.label);
          const longest = Math.max(...lines.map((line) => line.length));
          const fontSize = Math.min(baseFont, LABEL_SPACE / (longest * 0.58));
          return (
            <g key={`${segment.id}-${index}`}>
              {count > 1 && <path d={slicePath(index * slice, (index + 1) * slice)} fill={theme.fill} stroke="#0f1822" strokeWidth="0.6" />}
              <g transform={`rotate(${middle} ${CENTER} ${CENTER})`}>
                <text
                  x={CENTER}
                  y={CENTER - LABEL_START}
                  transform={`rotate(90 ${CENTER} ${CENTER - LABEL_START})`}
                  dominantBaseline="central"
                  fill={count === 1 ? '#ffffff' : theme.text}
                  fontSize={fontSize}
                  fontWeight="700"
                >
                  {lines.length === 1 ? lines[0] : lines.map((line, lineIndex) => (
                    <tspan key={lineIndex} x={CENTER} dy={lineIndex === 0 ? '-0.55em' : '1.1em'}>{line}</tspan>
                  ))}
                </text>
              </g>
            </g>
          );
        })}
        <circle cx={CENTER} cy={CENTER} r="15" fill="#ffffff" stroke="#ffcf15" strokeWidth="4" />
        <circle cx={CENTER} cy={CENTER} r="5" fill="#d31b34" />
      </svg>
    </div>
  );
}
