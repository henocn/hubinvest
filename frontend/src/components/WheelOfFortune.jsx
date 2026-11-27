import { Gift } from 'lucide-react';

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 90;
const LABEL_START = 83;
const LABEL_SPACE = 50;
const ICON_RADIUS = 27;
const ICON_SIZE = 10;
const BULBS = 16;
const BULB_RADIUS = RADIUS + 4.5;

const point = (angle, radius) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)];
};

const slicePath = (start, end) => {
  const [x0, y0] = point(start, RADIUS);
  const [x1, y1] = point(end, RADIUS);
  return `M${CENTER},${CENTER} L${x0},${y0} A${RADIUS},${RADIUS} 0 ${end - start > 180 ? 1 : 0} 1 ${x1},${y1} Z`;
};

// Couleur selon la case : un lot sur fond vert (texte blanc), une case perdante sur fond blanc (texte vert).
const sliceTheme = (segment) => (segment.kind === 'prize' ? { fill: '#156c53', text: '#ffffff' } : { fill: '#ffffff', text: '#156c53' });

const MAX_LINE = 14;

const clip = (line) => (line.length > MAX_LINE ? `${line.slice(0, MAX_LINE - 1)}…` : line);

// Coupe un texte long en deux lignes équilibrées, au mot le plus proche du milieu.
const toLines = (label) => {
  if (label.length <= 11 || !label.includes(' ')) return [clip(label)];
  const spaces = [...label.matchAll(/ /g)].map((match) => match.index);
  const cut = spaces.reduce((best, index) => (Math.abs(index - label.length / 2) < Math.abs(best - label.length / 2) ? index : best));
  return [clip(label.slice(0, cut)), clip(label.slice(cut + 1))];
};

// Deux couches superposées : le disque qui tourne (cases, textes, petit cadeau sur chaque lot), appliqué directement
// par discRef image par image sans repasser par React ; puis le cadre fixe (anneau, lumières qui clignotent, moyeu).
// spinning accélère les lumières, winner fait clignoter la case gagnante, pointerRef reçoit le petit coup de l'aiguille.
export default function WheelOfFortune({ segments, discRef, pointerRef, spinning = false, winner = -1 }) {
  const count = segments.length;
  const slice = count ? 360 / count : 360;
  const baseFont = count <= 6 ? 9.5 : count <= 10 ? 8 : count <= 14 ? 6.8 : 6;
  const state = winner >= 0 ? ' is-won' : spinning ? ' is-spinning' : '';

  return (
    <div className={`wheel${state}`}>
      <span ref={pointerRef} className="wheel-pointer" aria-hidden="true" />
      <div className="wheel-face">
        <svg
          ref={discRef}
          className="wheel-disc"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={segments.map((segment) => segment.label).join(', ')}
        >
          {count === 1 && <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#156c53" />}
          {segments.map((segment, index) => {
            const theme = sliceTheme(segment);
            const middle = (index + 0.5) * slice;
            const lines = toLines(segment.label);
            const longest = Math.max(...lines.map((line) => line.length));
            const fontSize = Math.min(baseFont, LABEL_SPACE / (longest * 0.58));
            return (
              <g key={`${segment.id}-${index}`} className={index === winner ? 'wheel-slice is-winner' : 'wheel-slice'}>
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
                  {segment.kind === 'prize' && (
                    <Gift
                      x={CENTER - ICON_SIZE / 2}
                      y={CENTER - ICON_RADIUS - ICON_SIZE / 2}
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                      color="#ffcf15"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                  )}
                </g>
              </g>
            );
          })}
        </svg>
        <svg className="wheel-frame" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={CENTER} cy={CENTER} r={BULB_RADIUS} fill="none" stroke="#0f1822" strokeWidth="9" />
          {Array.from({ length: BULBS }, (_value, index) => {
            const [x, y] = point((index * 360) / BULBS, BULB_RADIUS);
            return <circle key={index} className={`wheel-bulb${index % 2 ? ' is-odd' : ''}`} cx={x} cy={y} r="2.1" />;
          })}
          <circle className="wheel-hub-ring" cx={CENTER} cy={CENTER} r="15" fill="none" stroke="#ffcf15" strokeWidth="2" />
          <circle cx={CENTER} cy={CENTER} r="15" fill="#ffffff" stroke="#ffcf15" strokeWidth="4" />
          <circle cx={CENTER} cy={CENTER} r="5" fill="#d31b34" />
        </svg>
      </div>
    </div>
  );
}
