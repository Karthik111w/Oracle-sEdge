import { motion } from 'motion/react';

const ease = [0.16, 1, 0.3, 1];

// Fades and lifts its children into place the first time they scroll into view.
export default function Reveal({ as = 'div', delay = 0, y = 28, className, children, ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.8, ease, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Reveals a heading one word at a time, each rising from behind a mask.
// `text` is plain text; pass `accent` to set matching words in the display italic.
export function SplitHeading({ as: Tag = 'h2', text, accent = [], className = '', delay = 0, ...rest }) {
  const words = text.split(' ');
  return (
    <Tag className={`fx-split ${className}`} aria-label={text} {...rest}>
      {words.map((word, i) => (
        <span key={i} className="fx-split-mask" aria-hidden="true">
          <motion.span
            className={`fx-split-word${accent.includes(word.replace(/[.,]/g, '')) ? ' is-accent' : ''}`}
            initial={{ y: '110%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.06 }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
