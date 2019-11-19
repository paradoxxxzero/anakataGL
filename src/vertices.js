export const range = n => new Array(n).fill().map((_, i) => i)

export const leftPad = (s, n, c) =>
  range(n - s.length)
    .map(() => c)
    .join('') + s

export const intToTuple = (i, dimension) =>
  leftPad(i.toString(2), dimension, '0')
    .split('')
    .map(s => !!+s)
    .map(b => (b ? 1 : -1))

export const genVertices = dimension =>
  range(2 ** dimension).map(i => intToTuple(i, dimension))
