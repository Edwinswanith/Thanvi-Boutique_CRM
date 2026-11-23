import type { CollectionKey } from "@/lib/storefront/collections";

/**
 * Fabric guides shown on each collection page and marked up as FAQPage.
 * Written to answer the questions shoppers (and AI answer engines) ask, in plain
 * factual sentences. Keep claims to well-established textile facts.
 */

export interface Faq { q: string; a: string }

export interface CollectionGuide {
  seoTitle: string;
  seoDescription: string;
  intro: string;
  faqs: Faq[];
}

const care = (text: string): Faq => ({ q: "How should I care for it?", a: text });

export const COLLECTION_GUIDES: Record<CollectionKey, CollectionGuide> = {
  silk: {
    seoTitle: "Silk Sarees Online – Handwoven Pattu & Raga Silk | Thanvi",
    seoDescription: "Shop handwoven silk sarees online: pattu, raga, mulberry and Pochampally silks with zari borders, for weddings and festivals. Stores in Chennai, Madurai & more.",
    intro: "Silk sarees are woven from natural silk filament, which gives them their sheen, strength and graceful fall. Our silk collection includes pattu (traditional South Indian silk), raga silk, mulberry silk and Pochampally weaves, most finished with a zari border.",
    faqs: [
      { q: "What occasions are silk sarees best for?", a: "Silk sarees are the traditional choice for weddings, poojas, festivals and receptions, because the fabric holds colour and zari work richly and drapes formally." },
      { q: "What is the difference between pure silk and semi silk?", a: "Pure silk is woven entirely from silk yarn. Semi silk blends silk with another fibre such as cotton or polyester, which makes it lighter, easier to maintain and more affordable." },
      { q: "What is a Pochampally saree?", a: "Pochampally sarees come from Pochampally in Telangana and are known for ikat, where yarns are resist-dyed before weaving so the pattern appears as the cloth is woven." },
      care("Dry clean silk sarees. Store them folded in a muslin or cotton cloth, refold every few months, and keep perfume and deodorant away from the zari."),
    ],
  },
  cotton: {
    seoTitle: "Cotton Sarees Online – Handloom Cotton for Daily Wear | Thanvi",
    seoDescription: "Breathable handloom cotton sarees with zari, checks and woven borders. Ideal for office, summer and everyday wear. Shop online or in our Tamil Nadu stores.",
    intro: "Handloom cotton sarees are breathable, absorbent and comfortable in warm weather, which makes them the everyday saree of South India. Our cottons range from crisp checks to soft cottons with copper and gold zari.",
    faqs: [
      { q: "Are cotton sarees good for summer?", a: "Yes. Cotton breathes and absorbs sweat, so cotton sarees stay comfortable in hot, humid weather." },
      { q: "Do cotton sarees shrink?", a: "Handloom cotton can shrink slightly on the first wash. Wash it separately in cold water and dry it in the shade to keep the size and colour." },
      { q: "Can I wear a cotton saree to the office?", a: "Yes. Cotton sarees with simple borders or checks are a classic, comfortable choice for office wear." },
      care("Hand wash in cold water the first few times, dry in shade and starch lightly for a crisp drape."),
    ],
  },
  linen: {
    seoTitle: "Linen Sarees Online – Pure & Metallic Linen Sarees | Thanvi",
    seoDescription: "Crisp, cool linen sarees: pure linen, linen cotton, mirror work and metallic linen. Lightweight sarees for summer, work and brunch. Shop online at Thanvi.",
    intro: "Linen is woven from flax fibre. It is cool, strong and gets softer with every wash, with a natural slub texture that gives linen sarees a relaxed, modern look.",
    faqs: [
      { q: "Is linen better than cotton for summer?", a: "Linen dries faster and feels cooler than most cottons, so many people prefer it in very hot weather. It does crease more easily." },
      { q: "Do linen sarees wrinkle?", a: "Linen creases naturally; it is part of its character. Ironing while slightly damp gives a smooth drape." },
      { q: "When can I wear a linen saree?", a: "Linen sarees suit workdays, brunches, daytime functions and travel." },
      care("Hand wash cold or dry clean, and iron while slightly damp."),
    ],
  },
  tissue: {
    seoTitle: "Tissue Sarees Online – Tissue Silk & Tissue Cotton | Thanvi",
    seoDescription: "Light-catching tissue sarees in tissue cotton, tissue linen and matka tissue. Festive sarees with a metallic sheen. Shop online or visit our stores.",
    intro: "Tissue sarees are woven with metallic zari in the weft alongside silk, cotton or linen, which gives the fabric its light, shimmering, almost translucent glow.",
    faqs: [
      { q: "What is a tissue saree?", a: "A tissue saree is woven with zari (metallic thread) together with silk, cotton or linen, giving a lustrous metallic sheen while staying lightweight." },
      { q: "Are tissue sarees heavy?", a: "No. Tissue sarees are usually light and slightly crisp, which is why they are popular for festive daytime events." },
      { q: "When should I wear a tissue saree?", a: "Tissue sarees suit festivals, receptions, engagements and other celebrations where a subtle shine is welcome." },
      care("Dry clean only, and keep perfume away from the zari."),
    ],
  },
  chiffon: {
    seoTitle: "Chiffon & Georgette Sarees Online – Printed, Embroidered | Thanvi",
    seoDescription: "Flowing chiffon, georgette, crepe and satin sarees with prints and embroidery. Lightweight party and travel sarees. Shop online at Thanvi Boutique.",
    intro: "Chiffon and georgette are lightweight, sheer fabrics woven from twisted yarns. They fall in soft, fluid folds and are easy to drape, which makes them popular for parties and travel.",
    faqs: [
      { q: "What is the difference between chiffon and georgette?", a: "Both are sheer and lightweight. Georgette has a slightly grainy, crinkled texture and more weight; chiffon is smoother, lighter and more transparent." },
      { q: "Are chiffon sarees easy to drape?", a: "Yes. Their light weight and fluid fall make chiffon and georgette among the easiest sarees to drape and carry." },
      { q: "Do chiffon sarees crease?", a: "They resist creasing well, which makes them good for travel." },
      care("Gentle hand wash or dry clean. Do not wring; dry flat in shade."),
    ],
  },
  organza: {
    seoTitle: "Organza Sarees Online – Embroidered & Metallic Organza | Thanvi",
    seoDescription: "Sheer organza sarees with hand embroidery and metallic finishes, for engagements, receptions and statement evenings. Shop online at Thanvi Boutique.",
    intro: "Organza is a thin, sheer, crisp plain-weave fabric, traditionally made from silk. It holds its shape, so organza sarees drape with structure and show off embroidery beautifully.",
    faqs: [
      { q: "Are organza sarees transparent?", a: "Organza is sheer, so it is semi-transparent. It is usually worn with a matching petticoat and blouse." },
      { q: "Which occasions suit organza sarees?", a: "Organza sarees are popular for engagements, receptions, cocktail evenings and festive parties." },
      { q: "Is organza comfortable?", a: "Organza is very light. It is crisp rather than soft, so it suits shorter events and evenings." },
      care("Dry clean only and store rolled or loosely folded to avoid sharp creases."),
    ],
  },
  kota: {
    seoTitle: "Kota Sarees Online – Kota Doria Cotton Sarees | Thanvi Boutique",
    seoDescription: "Featherlight Kota Doria cotton sarees with the signature check weave, hand-painted and printed. Perfect for summer and office. Shop online at Thanvi Boutique.",
    intro: "Kota (Kota Doria) sarees come from the Kota region of Rajasthan. They are known for a featherlight, open check weave called khat, which makes them airy and comfortable in hot weather.",
    faqs: [
      { q: "What is a Kota saree?", a: "A Kota or Kota Doria saree is a lightweight saree from Kota, Rajasthan, woven with a distinctive square check pattern (khat) in cotton or a cotton-silk blend." },
      { q: "Are Kota sarees good for summer?", a: "Yes. The open weave lets air through, so Kota sarees are among the coolest sarees to wear in summer." },
      { q: "Are Kota sarees see-through?", a: "Kota is light and slightly sheer, so it is normally worn with a petticoat in a matching colour." },
      care("Hand wash cold separately and dry in shade. Starch lightly to keep the crisp finish."),
    ],
  },
  kalamkari: {
    seoTitle: "Kalamkari Sarees Online – Hand-drawn Kalamkari Prints | Thanvi",
    seoDescription: "Kalamkari sarees with hand-drawn and block-printed motifs in earthy, natural tones. Distinctive everyday and festive sarees. Shop online at Thanvi Boutique.",
    intro: "Kalamkari is a traditional textile art from Andhra Pradesh, where motifs are hand-drawn with a pen (kalam) or block-printed, often in natural, earthy colours. Kalamkari sarees tell stories through flowers, birds and mythology.",
    faqs: [
      { q: "What is Kalamkari?", a: "Kalamkari is a hand-painted or block-printed textile art from Andhra Pradesh, named after the 'kalam' (pen) used to draw the designs." },
      { q: "Where is Kalamkari from?", a: "The best-known Kalamkari traditions come from Srikalahasti and Machilipatnam in Andhra Pradesh." },
      { q: "When can I wear a Kalamkari saree?", a: "Kalamkari sarees suit cultural events, workdays and casual festive occasions, and make a thoughtful gift." },
      care("Hand wash cold separately for the first few washes and dry in shade to protect the colours."),
    ],
  },
  matka: {
    seoTitle: "Matka Silk Sarees Online – Textured Matka Sarees | Thanvi",
    seoDescription: "Textured matka silk sarees, plain and sequinned, with a rich earthy character. Festive sarees for evening functions. Shop online at Thanvi Boutique.",
    intro: "Matka silk is spun from short mulberry silk fibres, which gives it a coarse, nubby texture and a soft matte glow. Matka sarees feel substantial yet breathable.",
    faqs: [
      { q: "What is matka silk?", a: "Matka silk is a textured silk spun from short mulberry silk fibres, giving it a slightly rough, nubby surface and a natural matte sheen." },
      { q: "Is matka silk pure silk?", a: "Matka is made from silk fibres. Some matka sarees are blended or finished with zari or sequins, so check each product's description." },
      { q: "When should I wear a matka saree?", a: "Matka sarees suit festive occasions, evening functions and formal events." },
      care("Dry clean only."),
    ],
  },
  modal: {
    seoTitle: "Modal Sarees Online – Soft Modal Cotton & Modal Silk | Thanvi",
    seoDescription: "Silky-soft modal cotton and modal silk sarees for easy everyday drapes, office and travel. Shop modal sarees online at Thanvi Boutique.",
    intro: "Modal is a soft, semi-synthetic fibre made from beech-wood cellulose. Modal sarees feel silky, drape easily and hold dyes well, so colours stay bright.",
    faqs: [
      { q: "What is a modal saree?", a: "A modal saree is woven from modal fibre (made from beech-wood cellulose), often blended with cotton or silk, for a soft, silky drape." },
      { q: "Are modal sarees comfortable for daily wear?", a: "Yes. Modal is soft, breathable and light, which makes it comfortable for everyday and office wear." },
      { q: "Do modal sarees fade?", a: "Modal holds colour well. Washing in cold water and drying in shade keeps the colours bright for longer." },
      care("Gentle hand wash cold and dry in shade."),
    ],
  },
  mulberry: {
    seoTitle: "Mulberry Cotton Sarees Online – Striped Pallu Sarees | Thanvi",
    seoDescription: "Smooth mulberry cotton sarees with bold pallu stripes for daytime functions and smart everyday looks. Shop online at Thanvi Boutique.",
    intro: "Mulberry cotton sarees blend the smoothness of mulberry silk with the comfort of cotton, giving a graceful fall with an easy, breathable feel.",
    faqs: [
      { q: "What is a mulberry cotton saree?", a: "A mulberry cotton saree blends mulberry silk with cotton, combining a soft sheen with cotton's comfort." },
      { q: "When can I wear a mulberry cotton saree?", a: "They suit daytime functions, office wear and smart everyday occasions." },
      { q: "Are mulberry cotton sarees easy to maintain?", a: "They are easier to care for than pure silk; gentle hand washing or dry cleaning works well." },
      care("Gentle hand wash cold or dry clean."),
    ],
  },
};

export function guideFor(key: string): CollectionGuide | undefined {
  return COLLECTION_GUIDES[key as CollectionKey];
}
