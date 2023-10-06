import fs from "node:fs/promises";
import * as api from "./api.js";

const categoryWeapon = 1;

const weaponTypeHashes = [
  5, // Auto Rifle
  6, // Hand Cannon
  7, // Pulse Rifle
  8, // Scout Rifle
  9, // Fusion Rifle
  10, // Sniper Rifle
  11, // Shotgun
  12, // Machine Gun
  13, // Rocket Launcher
  14, // Sidearm
  54, // Sword
  153950757, // Grenade Launchers
  1504945536, // Linear Fusion Rifles
  2489664120, // Trace Rifles
  3317538576, // Bows
  3871742104, // Glaives
  3954685534, // Submachine Guns
];

const damageTypeOrder = ["Kinetic", "Arc", "Solar", "Void", "Stasis", "Strand"];

const filterItemByCategory = (categoryHash) => {
  return (item) => {
    return item.itemCategoryHashes?.includes(categoryHash);
  };
};

const filterItemByTier = (tier) => {
  return (item) => item.inventory.tierTypeHash === tier;
};

const pickWeaponTypeHash = (item) => {
  const potentialWeaponTypeHashes = item.itemCategoryHashes.filter((hash) =>
    weaponTypeHashes.includes(hash),
  );
  let weaponTypeHash;

  // Trivial case
  if (potentialWeaponTypeHashes.length === 1) {
    weaponTypeHash = potentialWeaponTypeHashes[0];
  }

  // Special logic for weapons with more than one type
  if (potentialWeaponTypeHashes.length > 1) {
    // Check for Linear Fusion Rifle
    if (
      potentialWeaponTypeHashes.includes(9) &&
      potentialWeaponTypeHashes.includes(1504945536)
    ) {
      weaponTypeHash = 1504945536;
    } else {
      throw new Error(
        `Unknown weapon type hash group for "${item.displayProperties.name}": [${potentialWeaponTypeHashes}]`,
      );
    }
  }

  return weaponTypeHash;
};

/**
 * Some weapon frames/archetypes are special modifications of existing ones.
 * To keep the tables compact, some of them are renamed to match their more
 * generic version.
 * @param {String} name
 * @returns {String}
 */
const remapPerkName = (name) => {
  const map = new Map();
  map.set("Häkke Precision Frame", "Precision Frame");
  map.set("MIDA Synergy", "Precision Frame"); // MIDA Mini-Tool
  map.set("Omolon Adaptive Frame", "Lightweight Frame");
  map.set("Shot Package", "Aggressive Frame"); // Felwinter's Lie
  map.set("Together Forever", "Adaptive Frame"); // Drang
  map.set("VEIST Rapid-Fire", "Rapid-Fire Frame");
  if (map.has(name)) {
    return map.get(name);
  } else {
    return name;
  }
};

const getWeapons = async (manifest) => {
  const DestinyDamageTypeDefinition = await api.getApi(
    manifest.DestinyDamageTypeDefinition,
  );
  const DestinySocketTypeDefinition = await api.getApi(
    manifest.DestinySocketTypeDefinition,
  );
  const DestinySocketCategoryDefinition = await api.getApi(
    manifest.DestinySocketCategoryDefinition,
  );
  const DestinyItemCategoryDefinition = await api.getApi(
    manifest.DestinyItemCategoryDefinition,
  );
  const DestinyPowerCapDefinition = await api.getApi(
    manifest.DestinyPowerCapDefinition,
  );
  const DestinyInventoryItemDefinition = await api.getApi(
    manifest.DestinyInventoryItemDefinition,
  );
  const weapons = Object.values(DestinyInventoryItemDefinition)
    .filter(filterItemByCategory(categoryWeapon))
    // Legendary
    .filter(filterItemByTier(4008398120))
    // Exclude dummy items
    .filter((item) => !filterItemByCategory(3109687656)(item))
    // Exclude sunset weapons
    .filter((weapon) => {
      return (
        DestinyPowerCapDefinition[
          weapon.quality?.versions[weapon.quality.currentVersion].powerCapHash
        ]?.powerCap > 9999
      );
    });
  // Only include items with collectible hashes
  const weaponInfo = weapons
    .map((item) => {
      return {
        name: item.displayProperties.name,
        icon: new URL(item.displayProperties.icon, api.URL_BASE),
        iconWatermark: item.quality
          ? // New format
            new URL(
              item.quality.displayVersionWatermarkIcons[
                item.quality.displayVersionWatermarkIcons.length - 1
              ],
              api.URL_BASE,
            )
          : // Old format
            new URL(item.iconWatermarkShelved, api.URL_BASE),
        hash: item.hash,
        weaponType:
          DestinyItemCategoryDefinition[pickWeaponTypeHash(item)]
            .displayProperties.name,
        damageType:
          DestinyDamageTypeDefinition[item.damageTypeHashes?.[0]]
            ?.displayProperties.name,
        intrinsicPerk: remapPerkName(
          item.sockets.socketEntries
            .filter((entry) => {
              const socketType =
                DestinySocketTypeDefinition[entry.socketTypeHash];
              const socketCategory =
                DestinySocketCategoryDefinition[socketType?.socketCategoryHash];
              return (
                socketCategory?.displayProperties.name === "INTRINSIC TRAITS"
              );
            })
            .map(
              (entry) =>
                DestinyInventoryItemDefinition[entry.singleInitialItemHash]
                  .displayProperties.name,
            )[0],
        ),
        // This is the best way I know of to determine craftability
        craftable:
          item.tooltipNotifications?.filter((tip) =>
            tip.displayStyle.includes("deepsight"),
          ).length > 0,
      };
    })
    .filter((item) => item.damageType !== undefined);
  return weaponInfo;
};

const main = async () => {
  const manifest = await api.getManifest("en");
  const weapons = await getWeapons(manifest);
  const weaponTypes = Array.from(
    new Set(weapons.map((weapon) => weapon.weaponType)),
  );
  weaponTypes.sort();
  const tables = [];
  const iconSize = 48;
  for (const weaponType of weaponTypes) {
    const weaponsOfType = weapons.filter(
      (weapon) => weapon.weaponType === weaponType,
    );
    const intrinsics = Array.from(
      new Set(weaponsOfType.map((weapon) => weapon.intrinsicPerk)),
    );
    intrinsics.sort((a, b) => a.localeCompare(b));
    const damageTypes = Array.from(
      new Set(weaponsOfType.map((weapon) => weapon.damageType)),
    );
    damageTypes.sort(
      (a, b) => damageTypeOrder.indexOf(a) - damageTypeOrder.indexOf(b),
    );

    const rows = [];

    for (const intrinsic of intrinsics) {
      const row = new Map();
      row.set("frame", intrinsic);
      for (const damageType of damageTypes) {
        const matchingWeapons = weaponsOfType.filter((weapon) => {
          return (
            (weapon.intrinsicPerk === intrinsic) &
            (weapon.damageType === damageType)
          );
        });
        matchingWeapons.sort((a, b) => a.name.localeCompare(b.name));
        row.set(damageType, matchingWeapons);
      }
      rows.push(row);
    }

    const captionId = weaponType.replace(/\s/g, "-");
    // Make HTML
    const html = `
      <table>
        <caption id="${captionId}"><a href="#${captionId}">${weaponType}</a></caption>
        <tr>
          <th scope="col">Frame</th>
          ${damageTypes
            .map((type) => `<th scope="col">${type}</th>`)
            .join("\n")}
        </tr>
        ${rows
          .map(
            (row) => `
              <tr>
                ${Array.from(row.values())
                  .map((weapons, index) => {
                    const val =
                      index === 0
                        ? // The first item in this array is the intrinsic perk
                          weapons
                        : // Otherwise it's an array of weapons
                          `
                          <ul>
                            ${weapons
                              .map((weapon) => {
                                const name = `${weapon.name}${
                                  weapon.craftable ? " (Craftable)" : ""
                                }`;
                                const watermark = weapon.iconWatermark;
                                const icon = weapon.icon;
                                const d2FoundryURL = new URL(
                                  `/w/${weapon.hash}`,
                                  "https://d2foundry.gg",
                                );
                                return `
                                  <li>
                                    <a href="${d2FoundryURL}" title="${name}">
                                      <div class="icon ${
                                        weapon.craftable ? "craftable" : ""
                                      }">
                                        <img
                                          class="icon-watermark"
                                          src="${watermark}"
                                          alt=""
                                          width="${iconSize}"
                                          height="${iconSize}"
                                          loading="lazy"
                                        >
                                        <img
                                          src="${icon}"
                                          alt="${name}"
                                          width="${iconSize}"
                                          height="${iconSize}"
                                          loading="lazy"
                                        >
                                      </div>
                                    </a>
                                  </li>
                                `;
                              })
                              .join("\n")}
                          </ul>
                        `;
                    return index === 0
                      ? `<th scope="row">${val}</th>`
                      : `<td>${val}</td>`;
                  })
                  .join("\n")}
              </tr>
            `,
          )
          .join("\n")}
      </table>
    `;
    tables.push(html);
  }
  const css = `
  :root {
    color-scheme: dark;
    --bg-dark: rgb(28, 27, 34);
    --fg-dark: rgb(251, 251, 254);
  }

  body {
    background: var(--bg-dark);
    color: var(--fg-dark);
    font-size: 18px;
    font-family: sans-serif;
  }

  a {
    color: #8c8cff;
  }
  a:visited {
    color: #ffadff;
  }

  h1 {
    margin: auto;
    text-align: center;
    font-size: 4em;
    margin-bottom: 3rem;
  }

  caption {
    font-size: 3em;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3em;
  }

  td,
  th {
    border: 1px solid grey;
  }

  tr {
    height: 2em;
  }

  th[scope="row"] {
    padding: 0 1em;
  }

  td {
    vertical-align: top;
    padding: 0.75em;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, ${iconSize}px);
    gap: 1em;
  }

  li {
    width: ${iconSize}px;
  }

  .icon {
    display: flex;
  }

  .icon.craftable {
    outline-color: rgb(162, 0, 0);
    outline-style: solid;
    outline-width: 2px;
  }

  .icon-watermark {
    position: absolute;
  }
  `;
  const fullPage = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Destiny 2 Damage Types vs. Weapon Frames</title>
      <style>
        ${css}
      </style>
  </head>
  <body>
      <h1>Non-Sunset Legendary Weapons</h1>
      ${tables.join("\n")}
      <footer>
        <p>Version: <code>${manifest.version}</code></p>
      </footer>
  </body>
  </html>
  `;
  await fs.writeFile("./index.html", fullPage);
};

main().catch(console.error);
