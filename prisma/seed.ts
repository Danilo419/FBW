// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function removeProductBySlug(slug: string) {
  const existing = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!existing) return;

  // 1) apagar OptionValues do produto
  const groups = await prisma.optionGroup.findMany({
    where: { productId: existing.id },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length) {
    await prisma.optionValue.deleteMany({ where: { groupId: { in: groupIds } } });
  }

  // 2) apagar OptionGroups e SizeStock
  await prisma.optionGroup.deleteMany({ where: { productId: existing.id } });
  await prisma.sizeStock.deleteMany({ where: { productId: existing.id } });

  // 3) apagar o Product
  await prisma.product.delete({ where: { id: existing.id } });
}

async function createPlayers(
  team: string,
  players: { name: string; number: number; position?: string }[]
) {
  for (const p of players) {
    await prisma.player.upsert({
      where: { player_team_name: { team, name: p.name } },
      update: { number: p.number, position: p.position },
      create: { team, name: p.name, number: p.number, position: p.position },
    });
  }
}

async function createProduct(
  slug: string,
  name: string,
  team: string,
  images: string[],
  price: number
) {
  // limpar tudo do produto anterior com o mesmo slug
  await removeProductBySlug(slug);

  const product = await prisma.product.create({
    data: {
      slug,
      name,
      team,
      basePrice: price,
      images,
      description: `Official ${team} jersey 25/26. Breathable and comfortable fabric for fans and athletes.`,
      sizes: {
        create: [
          { size: "S", stock: 10 },
          { size: "M", stock: 15 },
          { size: "L", stock: 12 },
          { size: "XL", stock: 8 },
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "size",
      label: "Size",
      type: "SIZE",
      required: true,
      values: {
        create: [
          { value: "S", label: "S", priceDelta: 0 },
          { value: "M", label: "M", priceDelta: 0 },
          { value: "L", label: "L", priceDelta: 0 },
          { value: "XL", label: "XL", priceDelta: 0 },
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "customization",
      label: "Customization",
      type: "RADIO",
      required: true,
      values: {
        create: [
          { value: "none", label: "No customization", priceDelta: 0 },
          { value: "name-number", label: "Name & Number", priceDelta: 1500 },
          { value: "badge", label: "Competition Badge", priceDelta: 800 },
          {
            value: "name-number-badge",
            label: "Name & Number + Competition Badge",
            priceDelta: 2100,
          },
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "shorts",
      label: "Shorts",
      type: "ADDON",
      required: false,
      values: { create: [{ value: "yes", label: "Add shorts", priceDelta: 2500 }] },
    },
  });

  await prisma.optionGroup.create({
    data: {
      productId: product.id,
      key: "socks",
      label: "Socks",
      type: "ADDON",
      required: false,
      values: { create: [{ value: "yes", label: "Add socks", priceDelta: 1200 }] },
    },
  });

  console.log("Seed OK:", product.slug);
}

async function main() {

  //--------------------------------------------------LA LIGA-----------------------------------------------------------
  await createPlayers("Real Madrid", [
    { name: "Carvajal", number: 2, position: "DF" },
    { name: "E. Militão", number: 3, position: "DF" },
    { name: "Alaba", number: 4, position: "DF" },
    { name: "Bellingham", number: 5, position: "MF" },
    { name: "Camavinga", number: 6, position: "MF" },
    { name: "Vini Jr.", number: 7, position: "FW" },
    { name: "Valverde", number: 8, position: "MF" },
    { name: "Endrick", number: 9, position: "FW" },
    { name: "Mbappé", number: 10, position: "FW" },
    { name: "Rodrygo", number: 11, position: "FW" },
    { name: "Trent", number: 12, position: "DF" },
    { name: "Tchouaméni", number: 14, position: "MF" },
    { name: "Arda Güler", number: 15, position: "MF" },
    { name: "Gonzalo", number: 16, position: "FW" },
    { name: "Asensio", number: 17, position: "MF" },
    { name: "A. Carreras", number: 18, position: "DF" },
    { name: "D. Ceballos", number: 19, position: "MF" },
    { name: "Fran García", number: 20, position: "DF" },
    { name: "Brahim", number: 21, position: "MF" },
    { name: "Rüdiger", number: 22, position: "DF" },
    { name: "F. Mendy", number: 23, position: "DF" },
    { name: "Huijsen", number: 24, position: "DF" },
    { name: "Mastantuono", number: 30, position: "MF" }
  ]);


  await createProduct(
    "jersey-real-madrid-25-26",
    "Real Madrid Jersey 25/26",
    "Real Madrid",
    ["/img/rm-front-25-26.png", "/img/rm-back-25-26.png"],
    100
  );

  await createPlayers("FC Barcelona", [
    { name: "Cubarsí", number: 5, position: "DF" },
    { name: "Kounde", number: 23, position: "DF" },
    { name: "Eric", number: 24, position: "DF" },
    { name: "Christensen", number: 15, position: "DF" },
    { name: "Balde", number: 3, position: "DF" },
    { name: "R. Araujo", number: 4, position: "DF" },
    { name: "F. de Jong", number: 21, position: "MF" },
    { name: "Pedri", number: 8, position: "MF" },
    { name: "Gavi", number: 6, position: "MF" },
    { name: "Olmo", number: 20, position: "MF" },
    { name: "Fermín", number: 16, position: "MF" },
    { name: "M. Casadó", number: 17, position: "MF" },
    { name: "Lewandowski", number: 9, position: "FW" },
    { name: "Lamine Yamal", number: 10, position: "FW" },
    { name: "Raphinha", number: 11, position: "FW" },
    { name: "Ferran", number: 7, position: "FW" },
    { name: "Rashford", number: 14, position: "FW" }
  ]);

  await createProduct(
    "jersey-barcelona-25-26",
    "FC Barcelona Jersey 25/26",
    "FC Barcelona",
    ["/img/fcb-front-25-26.png", "/img/fcb-back-25-26.png"],
    8999
  );

  
  await createPlayers("Atlético de Madrid", [
    { name: "J.M. Giménez", number: 2, position: "DF" },
    { name: "Ruggeri", number: 3, position: "DF" },
    { name: "Gallagher", number: 4, position: "MF" },
    { name: "Johnny", number: 5, position: "DF" },
    { name: "Koke", number: 6, position: "MF" },
    { name: "Griezmann", number: 7, position: "FW" },
    { name: "Barrios", number: 8, position: "MF" },
    { name: "Sørloth", number: 9, position: "FW" },
    { name: "Álex B.", number: 10, position: "MF" },
    { name: "Almada", number: 11, position: "MF" },
    { name: "M. Llorente", number: 14, position: "MF" },
    { name: "Lenglet", number: 15, position: "DF" },
    { name: "Molina", number: 16, position: "DF" },
    { name: "Hancko", number: 17, position: "DF" },
    { name: "Marc Pubill", number: 18, position: "DF" },
    { name: "J. Alvarez", number: 19, position: "FW" },
    { name: "Giuliano", number: 20, position: "FW" },
    { name: "Javi Galán", number: 21, position: "DF" },
    { name: "Raspadori", number: 22, position: "FW" },
    { name: "Le Normand", number: 24, position: "DF" }
  ]);


  await createProduct(
    "jersey-atm-25-26",
    "Atlético de Madrid Jersey 25/26",
    "Atlético de Madrid",
    ["/img/atm-front-25-26.png", "/img/atm-back-25-26.png"],
    8999
  );

  await createPlayers("Real Betis", [
    { name: "Bellerín", number: 2, position: "DF" },
    { name: "Llorente R.", number: 3, position: "DF" },
    { name: "Natan", number: 4, position: "DF" },
    { name: "Bartra", number: 5, position: "DF" },
    { name: "S. Altimira", number: 6, position: "MF" },
    { name: "P. Fornals", number: 8, position: "MF" },
    { name: "Ávila Chimy", number: 9, position: "FW" },
    { name: "Ez Abde", number: 10, position: "FW" },
    { name: "Bakambu", number: 11, position: "FW" },
    { name: "Rodriguez", number: 12, position: "MF" },
    { name: "V. Gómez", number: 16, position: "DF" },
    { name: "Riquelme", number: 17, position: "MF" },
    { name: "N. Deossa", number: 18, position: "MF" },
    { name: "C. Hernández", number: 19, position: "DF" },
    { name: "Lo Celso", number: 20, position: "MF" },
    { name: "Marc Roca", number: 21, position: "MF" },
    { name: "Isco", number: 22, position: "MF" },
    { name: "J. Firpo", number: 23, position: "DF" },
    { name: "Aitor Ruibal", number: 24, position: "FW" },
    { name: "Á. Ortiz", number: 40, position: "GK" },
    { name: "Pablo G.", number: 52, position: "GK" },
  ]);


  await createProduct(
    "jersey-betis-25-26",
    "Real Betis Jersey 25/26",
    "Real Betis",
    ["/img/betis-front-25-26.png", "/img/betis-back-25-26.png"],
    8499
  );

  await createPlayers("Sevilla FC", [
    { name: "Carmona", number: 2, position: "DF" },
    { name: "Pedrosa", number: 3, position: "DF" },
    { name: "Kike Salas", number: 4, position: "DF" },
    { name: "Vargas", number: 5, position: "MF" },
    { name: "Gudelj", number: 6, position: "MF" },
    { name: "Isaac", number: 7, position: "FW" },
    { name: "Jordán", number: 8, position: "MF" },
    { name: "Akor", number: 9, position: "FW" },
    { name: "Lukébakio", number: 11, position: "FW" },
    { name: "Alfon", number: 12, position: "FW" },
    { name: "Peque", number: 14, position: "FW" },
    { name: "Juanlu", number: 16, position: "DF" },
    { name: "Agoumé", number: 18, position: "MF" },
    { name: "Sow", number: 20, position: "MF" },
    { name: "Ejuke", number: 21, position: "FW" },
    { name: "Badé", number: 22, position: "DF" },
    { name: "Marcao", number: 23, position: "DF" },
    { name: "Nianzou", number: 24, position: "DF" },
    { name: "Idumbo", number: 27, position: "FW" },
    { name: "Manu Bueno", number: 28, position: "MF" },
    { name: "A. Castrín", number: 40, position: "DF" }
  ]);

  await createProduct(
    "jersey-sevilla-25-26",
    "Sevilla FC Jersey 25/26",
    "Sevilla FC",
    ["/img/sevilla-front-25-26.png", "/img/sevilla-back-25-26.png"],
    8499
  );

  await createPlayers("Real Sociedad", [
    { name: "Aramburu", number: 2, position: "DF" },
    { name: "Aihen", number: 3, position: "DF" },
    { name: "Gorrotxa", number: 4, position: "DF" },
    { name: "Zubeldia", number: 5, position: "DF" },
    { name: "Aritz", number: 6, position: "DF" },
    { name: "Barrene", number: 7, position: "FW" },
    { name: "Turientes", number: 8, position: "MF" },
    { name: "Óskarsson", number: 9, position: "FW" },
    { name: "Oyarzabal", number: 10, position: "FW" },
    { name: "Guedes", number: 11, position: "FW" },
    { name: "Take", number: 14, position: "MF" },
    { name: "Urko", number: 15, position: "MF" },
    { name: "Ćaleta-Car", number: 16, position: "DF" },
    { name: "Sergio Gómez", number: 17, position: "DF" },
    { name: "H. Traoré", number: 18, position: "DF" },
    { name: "Karrikaburu", number: 19, position: "FW" },
    { name: "Pacheco", number: 20, position: "DF" },
    { name: "Zakharyan", number: 21, position: "MF" },
    { name: "Goti", number: 22, position: "MF" },
    { name: "Brais Méndez", number: 23, position: "MF" },
    { name: "Sučić", number: 24, position: "MF" },
    { name: "Marín", number: 28, position: "MF" },
    { name: "Jon Martín", number: 31, position: "DF" },
  ]);

  await createProduct(
    "jersey-realsociedad-25-26",
    "Real Sociedad Jersey 25/26",
    "Real Sociedad",
    ["/img/realsociedad-front-25-26.png", "/img/realsociedad-back-25-26.png"],
    8499
  );

  await createPlayers("Villarreal", [
  { name: "Costa", number: 2, position: "GK" },
  { name: "A. Alti", number: 3, position: "MF" },
  { name: "Rafa Marín", number: 4, position: "DF" },
  { name: "Kambwala", number: 5, position: "DF" },
  { name: "Denis Suárez", number: 6, position: "MF" },
  { name: "Gerard", number: 7, position: "FW" },
  { name: "Foyth", number: 8, position: "DF" },
  { name: "Parejo", number: 10, position: "MF" },
  { name: "I. Akhomach", number: 11, position: "FW" },
  { name: "Renato Veiga", number: 12, position: "DF" },
  { name: "Santi C.V.", number: 14, position: "MF" },
  { name: "Mouriño", number: 15, position: "DF" },
  { name: "T. Partey", number: 16, position: "MF" },
  { name: "Buchanan", number: 17, position: "FW" },
  { name: "Gueye", number: 18, position: "MF" },
  { name: "Pepe", number: 19, position: "FW" },
  { name: "Moleiro", number: 20, position: "MF" },
  { name: "Yeremy", number: 21, position: "FW" },
  { name: "Ayoze", number: 22, position: "FW" },
  { name: "S. Cardona", number: 23, position: "DF" },
  { name: "A. Pedraza", number: 24, position: "DF" },
  { name: "Pau Navarro", number: 26, position: "DF" },
  { name: "J. Ives Valou", number: 27, position: "MF" },
  { name: "Etta Eyong", number: 29, position: "MF" },
  { name: "Cabanes", number: 33, position: "DF" },
  ]);

  await createProduct(
    "jersey-villarreal-25-26",
    "Villarreal Jersey 25/26",
    "Villarreal",
    ["/img/villarreal-front-25-26.png", "/img/villarreal-back-25-26.png"],
    8499
  );

  await createPlayers("Athletic Club", [
    { name: "Gorosabel", number: 2, position: "DF" },
    { name: "Vivian", number: 3, position: "DF" },
    { name: "Paredes", number: 4, position: "DF" },
    { name: "Yeray", number: 5, position: "DF" },
    { name: "Vesga", number: 6, position: "MF" },
    { name: "Berenguer", number: 7, position: "FW" },
    { name: "O. Sancet", number: 8, position: "MF" },
    { name: "Williams", number: 9, position: "FW" },
    { name: "Williams JR", number: 10, position: "FW" },
    { name: "Guruzeta", number: 11, position: "FW" },
    { name: "Areso", number: 12, position: "DF" },
    { name: "Vencedor", number: 13, position: "MF" },
    { name: "Adu Ares", number: 14, position: "FW" },
    { name: "I. Lekue", number: 15, position: "DF" },
    { name: "R. de Galarreta", number: 16, position: "MF" },
    { name: "Yuri", number: 17, position: "DF" },
    { name: "Jauregizar", number: 18, position: "MF" },
    { name: "Adama", number: 19, position: "FW" },
    { name: "Unai G.", number: 20, position: "MF" },
    { name: "Maroan", number: 21, position: "FW" },
    { name: "Nico Serrano", number: 22, position: "FW" },
    { name: "Robert Navarro", number: 23, position: "MF" },
    { name: "Prados", number: 24, position: "MF" },
    { name: "Izeta", number: 25, position: "FW" },
    { name: "Canales", number: 28, position: "MF" },
    { name: "Rego", number: 30, position: "DF" },
    { name: "De Luis", number: 34, position: "GK" }
  ]);

  await createProduct(
    "jersey-athletic-25-26",
    "Athletic Club Jersey 25/26",
    "Athletic Club",
    ["/img/athletic-front-25-26.png", "/img/athletic-back-25-26.png"],
    8299
  );

  await createPlayers("Getafe CF", [
    { name: "Djene", number: 2, position: "DF" },
    { name: "A. Abqar", number: 3, position: "DF" },
    { name: "Neyou", number: 4, position: "MF" },
    { name: "Milla", number: 5, position: "MF" },
    { name: "A. Sola", number: 7, position: "DF" },
    { name: "Arambarri", number: 8, position: "MF" },
    { name: "Mayoral", number: 9, position: "FW" },
    { name: "Ucha", number: 10, position: "MF" },
    { name: "Juanmi", number: 11, position: "FW" },
    { name: "Javi Muñoz", number: 14, position: "MF" },
    { name: "Rico", number: 16, position: "DF" },
    { name: "Alex", number: 18, position: "MF" },
    { name: "Peter", number: 19, position: "FW" },
    { name: "Coba", number: 20, position: "MF" },
    { name: "Iglesias", number: 21, position: "MF" },
    { name: "Domingos D.", number: 22, position: "DF" },
    { name: "Liso", number: 23, position: "MF" },
    { name: "Risco", number: 30, position: "FW" },
    { name: "Bekhoucha", number: 31, position: "DF" },
    { name: "Pérez", number: 37, position: "FW" }
  ]);

  await createProduct(
    "jersey-getafe-25-26",
    "Getafe CF Jersey 25/26",
    "Getafe CF",
    ["/img/getafe-front-25-26.png", "/img/getafe-back-25-26.png"],
    8999
  );

  await createPlayers("Elche CF", [
    { name: "Jairo",           number: 3,  position: "DF" },
    { name: "Bambo Diaby",     number: 4,  position: "DF" },
    { name: "F. Redondo",      number: 5,  position: "MF" },
    { name: "Bigas",           number: 6,  position: "DF" },
    { name: "Y. Santiago",     number: 7,  position: "MF" },
    { name: "M. Aguado",       number: 8,  position: "MF" },
    { name: "André Silva",     number: 9,  position: "FW" },
    { name: "Rafa Mir",        number: 10, position: "FW" },
    { name: "Germán V.",       number: 11, position: "MF" },
    { name: "A. Febas",        number: 14, position: "MF" },
    { name: "Álvaro Nuñez",    number: 15, position: "DF" },
    { name: "M. Neto",         number: 16, position: "MF" },
    { name: "Josan",           number: 17, position: "MF" },
    { name: "John",            number: 18, position: "DF" },
    { name: "Mourad",          number: 19, position: "FW" },
    { name: "Álvaro R.",       number: 20, position: "FW" },
    { name: "L. Petrot",       number: 21, position: "DF" },
    { name: "Affengruber",     number: 22, position: "DF" },
    { name: "V. Chust",        number: 23, position: "DF" },
    { name: "A. Niculăesei",   number: 27, position: "DF" },
    { name: "R. Mendoza",      number: 30, position: "MF" },
    { name: "A. Boayar",       number: 32, position: "FW" },
    { name: "Nordin",          number: 34, position: "FW" },
    { name: "A. Houary",       number: 35, position: "MF" }
  ]);

  await createProduct(
      "jersey-elche-25-26",
      "Elche CF Jersey 25/26",
      "Elche CF",
      ["/img/elche-front-25-26.png", "/img/elche-back-25-26.png"],
      8999
  );

  await createPlayers("Valencia CF", [
    { name: "Copete",        number: 3,  position: "DF" },
    { name: "Diakhaby",      number: 4,  position: "DF" },
    { name: "Tárrega",       number: 5,  position: "DF" },
    { name: "H. Guillamón",  number: 6,  position: "MF" },
    { name: "Danjuma",       number: 7,  position: "FW" },
    { name: "Javi Guerra",   number: 8,  position: "MF" },
    { name: "Hugo Duro",     number: 9,  position: "FW" },
    { name: "Almeida",       number: 10, position: "MF" },
    { name: "Rioja",         number: 11, position: "FW" },
    { name: "Thierry",       number: 12, position: "DF" },
    { name: "Gayà",          number: 14, position: "DF" },
    { name: "Diego López",   number: 16, position: "FW" },
    { name: "Ramazani",      number: 17, position: "FW" },
    { name: "Pepelu",        number: 18, position: "MF" },
    { name: "Dani Raba",     number: 19, position: "FW" },
    { name: "Foulquier",     number: 20, position: "DF" },
    { name: "J. Vázquez",    number: 21, position: "DF" },
    { name: "Santamaría",    number: 22, position: "MF" },
    { name: "Ugrinic",       number: 23, position: "MF" },
    { name: "Cömert",        number: 24, position: "DF" }
  ]);

  await createProduct(
    "jersey-valencia-25-26",
    "Valencia CF Jersey 25/26",
    "Valencia CF",
    ["/img/valencia-front-25-26.png", "/img/valencia-back-25-26.png"],
    8999
  );

  await createPlayers("RCD Espanyol", [
    { name: "Rubén S.",       number: 2,  position: "DF" },
    { name: "G. de Zárate",   number: 4,  position: "MF" },
    { name: "Calero",         number: 5,  position: "DF" },
    { name: "Cabrera",        number: 6,  position: "DF" },
    { name: "Puado",          number: 7,  position: "FW" },
    { name: "Edu Expósito",   number: 8,  position: "MF" },
    { name: "Roberto",        number: 9,  position: "FW" },
    { name: "Pol Lozano",     number: 10, position: "MF" },
    { name: "Pere Milla",     number: 11, position: "FW" },
    { name: "Salinas",        number: 12, position: "DF" },
    { name: "R. Terrats",     number: 14, position: "MF" },
    { name: "Miguel Rubio",   number: 15, position: "DF" },
    { name: "Koleosho",       number: 16, position: "FW" },
    { name: "Jofre",          number: 17, position: "FW" },
    { name: "Pickel",         number: 18, position: "MF" },
    { name: "Kike G.",        number: 19, position: "FW" },
    { name: "A. Roca",        number: 20, position: "MF" },
    { name: "C. Romero",      number: 22, position: "DF" },
    { name: "El Hilali",      number: 23, position: "DF" },
    { name: "Dolan",          number: 24, position: "FW" },
    { name: "Riedel",         number: 38, position: "DF" }
  ]);

  await createProduct(
    "jersey-espanyol-25-26",
    "RCD Espanyol Jersey 25/26",
    "RCD Espanyol",
    ["/img/espanyol-front-25-26.png", "/img/espanyol-back-25-26.png"],
    8999
  );


  await createPlayers("Alavés", [
    { name: "Garcés",        number: 2,  position: "DF" },
    { name: "Yusi",          number: 3,  position: "DF" },
    { name: "Denis Suárez",  number: 4,  position: "MF" },
    { name: "Pacheco",       number: 5,  position: "DF" },
    { name: "Guevara",       number: 6,  position: "MF" },
    { name: "C. Vicente",    number: 7,  position: "FW" },
    { name: "A. Blanco",     number: 8,  position: "MF" },
    { name: "Mariano",       number: 9,  position: "FW" },
    { name: "Aleñá",         number: 10, position: "MF" },
    { name: "Toni Martínez", number: 11, position: "FW" },
    { name: "Maras",         number: 12, position: "DF" },
    { name: "Tenaglia",      number: 14, position: "DF" },
    { name: "Boyé",          number: 15, position: "FW" },
    { name: "Novoa",         number: 16, position: "DF" },
    { name: "Jonny",         number: 17, position: "DF" },
    { name: "Guridi",        number: 18, position: "MF" },
    { name: "P. Ibáñez",     number: 19, position: "MF" },
    { name: "Calebe",        number: 20, position: "MF" },
    { name: "Abde",          number: 21, position: "FW" },
    { name: "M. Diarra",     number: 22, position: "DF" },
    { name: "Protesoni",     number: 23, position: "MF" },
    { name: "Parada",        number: 24, position: "DF" }
  ]);

  await createProduct(
    "jersey-alaves-25-26",
    "Alavés Jersey 25/26",
    "Alavés",
    ["/img/alaves-front-25-26.png", "/img/alaves-back-25-26.png"],
    8999
  );


  //--------------------------------------------------LA LIGA-----------------------------------------------------------



  //--------------------------------------------------PRIMEIRA LIGA PORTUGAL-----------------------------------------------------------
  await createPlayers("SL Benfica", [
    { name: "Antónios", number: 4, position: "DF" },
    { name: "Barrenechea", number: 5, position: "MF" },
    { name: "Bah", number: 6, position: "DF" },
    { name: "Aursnes", number: 8, position: "MF" },
    { name: "Ivanović", number: 9, position: "FW" },
    { name: "Pavlidis", number: 14, position: "FW" },
    { name: "Manu", number: 16, position: "DF" },
    { name: "Aktürkoğlu", number: 17, position: "FW" },
    { name: "Barreiro", number: 18, position: "MF" },
    { name: "Richard Ríos", number: 20, position: "MF" },
    { name: "Schjelderup", number: 21, position: "FW" },
    { name: "Prestianni", number: 25, position: "FW" },
    { name: "Dahl", number: 26, position: "GK" },
    { name: "Bruma", number: 27, position: "FW" },
    { name: "Otamendi", number: 30, position: "DF" },
    { name: "H. Araújo", number: 39, position: "FW" },
    { name: "Tomás A.", number: 44, position: "DF" },
    { name: "T. Gouveia", number: 47, position: "FW" },
    { name: "Florentino", number: 61, position: "MF" },
    { name: "J. Veloso", number: 68, position: "MF" },
    { name: "João Rego", number: 84, position: "DF" },
    { name: "Prioste", number: 86, position: "MF" }
  ]);


  await createProduct(
    "jersey-benfica-25-26",
    "SL Benfica Jersey 25/26",
    "SL Benfica",
    ["/img/slb-front-25-26.png", "/img/slb-back-25-26.png"],
    8499
  );

  await createPlayers("Sporting CP", [
    { name: "Matheus R.", number: 2, position: "GK" },
    { name: "St. Juste", number: 3, position: "DF" },
    { name: "Morita", number: 5, position: "MF" },
    { name: "Debast", number: 6, position: "DF" },
    { name: "G. Quenda", number: 7, position: "FW" },
    { name: "Pedro G.", number: 8, position: "MF" },
    { name: "Geny", number: 10, position: "FW" },
    { name: "Nuno Santos", number: 11, position: "FW" },
    { name: "Vagiannidis", number: 13, position: "DF" },
    { name: "Kocharashvili", number: 14, position: "MF" },
    { name: "Trincão", number: 17, position: "FW" },
    { name: "Harder", number: 19, position: "FW" },
    { name: "M. Araújo", number: 20, position: "DF" },
    { name: "Fresneda", number: 22, position: "DF" },
    { name: "D. Bragança", number: 23, position: "MF" },
    { name: "G. Inácio", number: 25, position: "DF" },
    { name: "O. Diomande", number: 26, position: "DF" },
    { name: "Alisson S.", number: 27, position: "FW" },
    { name: "R. Ribeiro", number: 28, position: "GK" },
    { name: "Hjulmand", number: 42, position: "MF" },
    { name: "R. Esgaio", number: 47, position: "DF" },
    { name: "J. Simões", number: 52, position: "MF" },
    { name: "E. Quaresma", number: 72, position: "DF" },
    { name: "R.C. Mangas", number: 91, position: "DF" },
    { name: "Suárez", number: 97, position: "FW" }
  ]);


  await createProduct(
    "jersey-sporting-25-26",
    "Sporting CP Jersey 25/26",
    "Sporting CP",
    ["/img/scp-front-25-26.png", "/img/scp-back-25-26.png"],
    8499
  );

  await createPlayers("FC Porto", [
    { name: "Zé Pedro", number: 3, position: "DF" },
    { name: "Bednarek", number: 5, position: "DF" },
    { name: "Eustaquio", number: 6, position: "MF" },
    { name: "W. Gomes", number: 7, position: "FW" },
    { name: "Froholdt", number: 8, position: "MF" },
    { name: "Samu. A", number: 9, position: "FW" },
    { name: "Gabri Veiga", number: 10, position: "MF" },
    { name: "Pepê", number: 11, position: "FW" },
    { name: "Zaidu M.", number: 12, position: "DF" },
    { name: "Vasco", number: 15, position: "DF" },
    { name: "M. Grujić", number: 16, position: "MF" },
    { name: "Borja Sainz", number: 17, position: "FW" },
    { name: "Nehuen", number: 18, position: "DF" },
    { name: "Namaso", number: 19, position: "FW" },
    { name: "Alberto", number: 20, position: "FW" },
    { name: "Prpić", number: 21, position: "MF" },
    { name: "Varela", number: 22, position: "DF" },
    { name: "João Costa", number: 24, position: "GK" },
    { name: "Tomás Pérez", number: 25, position: "DF" },
    { name: "De Jong", number: 26, position: "DF" },
    { name: "Gül", number: 27, position: "GK" },
    { name: "Moreira", number: 45, position: "DF" },
    { name: "Martim", number: 52, position: "DF" },
    { name: "Moura", number: 74, position: "FW" },
    { name: "Iván Jaime", number: 77, position: "MF" },
    { name: "R. Mora", number: 86, position: "FW" },
  ]);


  await createProduct(
    "jersey-porto-25-26",
    "FC Porto Jersey 25/26",
    "FC Porto",
    ["/img/fcp-front-25-26.png", "/img/fcp-back-25-26.png"],
    8499
  );

  await createPlayers("SC Braga", [
    { name: "Victor G.", number: 2, position: "DF" },
    { name: "Bambu", number: 3, position: "DF" },
    { name: "Niakaté", number: 4, position: "DF" },
    { name: "Lelo", number: 5, position: "DF" },
    { name: "Vitor C.", number: 6, position: "MF" },
    { name: "J. Moutinho", number: 8, position: "MF" },
    { name: "El Ouazzani", number: 9, position: "FW" },
    { name: "Gharbi", number: 11, position: "MF" },
    { name: "Lagerbielke", number: 14, position: "DF" },
    { name: "P. Oliveira", number: 15, position: "DF" },
    { name: "Zalazar", number: 16, position: "MF" },
    { name: "G. Moscardo", number: 17, position: "MF" },
    { name: "Pau Víctor", number: 18, position: "FW" },
    { name: "Dorgeles", number: 20, position: "FW" },
    { name: "R. Horta", number: 21, position: "FW" },
    { name: "Arrey-Mbi", number: 26, position: "DF" },
    { name: "Gorby J.B.", number: 29, position: "MF" },
    { name: "J. Marques", number: 33, position: "FW" },
    { name: "F. Navarro", number: 39, position: "FW" },
    { name: "Da Rocha", number: 41, position: "GK" },
    { name: "Diego", number: 50, position: "GK" },
    { name: "Patrão", number: 67, position: "MF" },
    { name: "Gabri Mtz.", number: 77, position: "FW" },
    { name: "S. Vidigal", number: 95, position: "MF" }
  ]);


  await createProduct(
    "jersey-braga-25-26",
    "SC Braga Jersey 25/26",
    "SC Braga",
    ["/img/braga-front-25-26.png", "/img/braga-back-25-26.png"],
    7999
  );

  await createPlayers("Vitória SC", [
    { name: "M. Maga", number: 2, position: "DF" },
    { name: "M. Nóbrega", number: 3, position: "DF" },
    { name: "P. Vitor", number: 5, position: "DF" },
    { name: "Mitrović", number: 6, position: "DF" },
    { name: "Händel", number: 8, position: "MF" },
    { name: "Bica", number: 9, position: "FW" },
    { name: "Tiago Silva", number: 10, position: "MF" },
    { name: "O. Rivas", number: 15, position: "DF" },
    { name: "Beni", number: 16, position: "MF" },
    { name: "Lebedenko", number: 17, position: "DF" },
    { name: "Arcanjo", number: 18, position: "MF" },
    { name: "Camara", number: 19, position: "MF" },
    { name: "Samu", number: 20, position: "MF" },
    { name: "Vando Félix", number: 21, position: "FW" },
    { name: "Fábio", number: 22, position: "DF" },
    { name: "Lobão", number: 23, position: "DF" },
    { name: "Abascal", number: 26, position: "DF" },
    { name: "Strata", number: 66, position: "DF" },
    { name: "G. Silva", number: 71, position: "DF" },
    { name: "Nuno Santos", number: 77, position: "FW" },
    { name: "Michel", number: 86, position: "FW" },
    { name: "NDoye", number: 90, position: "FW" }
  ]);


  await createProduct(
    "jersey-vitoria-25-26",
    "Vitória SC Jersey 25/26",
    "Vitória SC",
    ["/img/vsc-front-25-26.png", "/img/vsc-back-25-26.png"],
    7999
  );

  //--------------------------------------------------PRIMEIRA LIGA PORTUGAL-----------------------------------------------------------

}


main()
  .then(() => console.log("Seed finished"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
