import type { StudySet } from "./types";

const t = Date.UTC(2026, 0, 1);

function cards(prefix: string, pairs: [string, string][]) {
  return pairs.map(([term, definition], i) => ({ id: `${prefix}-${i}`, term, definition }));
}

export const SEED_SETS: StudySet[] = [
  {
    id: "spanish-basics",
    title: "Spanish: Everyday Basics",
    description: "Common words and phrases for getting around.",
    createdAt: t,
    updatedAt: t,
    cards: cards("es", [
      ["hola", "hello"],
      ["gracias", "thank you"],
      ["por favor", "please"],
      ["el agua", "water"],
      ["la biblioteca", "library"],
      ["el perro", "dog"],
      ["la manzana", "apple"],
      ["mañana", "tomorrow"],
      ["¿Dónde está el baño?", "Where is the bathroom?"],
      ["Me llamo…", "My name is…"],
    ]),
  },
  {
    id: "cell-biology",
    title: "Cell Biology",
    description: "Organelles and what they do.",
    createdAt: t + 1,
    updatedAt: t + 1,
    cards: cards("bio", [
      ["Mitochondria", "Produces ATP through cellular respiration"],
      ["Ribosome", "Synthesizes proteins from mRNA"],
      ["Nucleus", "Stores the cell's DNA and controls gene expression"],
      ["Golgi apparatus", "Modifies, sorts, and packages proteins for transport"],
      ["Lysosome", "Breaks down waste using digestive enzymes"],
      ["Chloroplast", "Site of photosynthesis in plant cells"],
      ["Cell membrane", "Phospholipid bilayer that controls what enters and leaves the cell"],
      ["Rough ER", "Membrane network studded with ribosomes; makes membrane and secreted proteins"],
    ]),
  },
];
