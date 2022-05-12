import fs from "fs/promises";
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
    weaponTypeHashes.includes(hash)
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
        `Unknown weapon type hash group for "${item.displayProperties.name}": [${potentialWeaponTypeHashes}]`
      );
    }
  }

  return weaponTypeHash;
};

const remapPerkName = (name) => {
  const map = new Map();
  map.set("Häkke Precision Frame", "Precision Frame");
  map.set("VEIST Rapid-Fire", "Rapid-Fire Frame");
  map.set("Omolon Adaptive Frame", "Adaptive Frame");
  if (map.has(name)) {
    return map.get(name);
  } else {
    return name;
  }
};

const getWeapons = async () => {
  const manifest = await api.getManifest("en");
  const DestinyDamageTypeDefinition = await api.getApi(
    manifest.DestinyDamageTypeDefinition
  );
  const DestinySocketTypeDefinition = await api.getApi(
    manifest.DestinySocketTypeDefinition
  );
  const DestinySocketCategoryDefinition = await api.getApi(
    manifest.DestinySocketCategoryDefinition
  );
  const DestinyItemCategoryDefinition = await api.getApi(
    manifest.DestinyItemCategoryDefinition
  );
  const DestinyPowerCapDefinition = await api.getApi(
    manifest.DestinyPowerCapDefinition
  );
  const DestinyInventoryItemDefinition = await api.getApi(
    manifest.DestinyInventoryItemDefinition
  );
  const weapons = Object.values(DestinyInventoryItemDefinition)
    .filter(filterItemByCategory(categoryWeapon))
    .filter(filterItemByTier(4008398120)) // Legendary
    // Exclude sunset weapons
    .filter((weapon) => {
      return (
        DestinyPowerCapDefinition[
          weapon.quality?.versions[weapon.quality.currentVersion].powerCapHash
        ]?.powerCap > 9999
      );
    });
  const weaponInfo = weapons
    .map((item) => {
      return {
        name: item.displayProperties.name,
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
                  .displayProperties.name
            )[0]
        ),
      };
    })
    .filter((item) => item.damageType !== undefined);
  return weaponInfo;
};

const main = async () => {
  const weapons = await getWeapons();
  const weaponTypes = Array.from(
    new Set(weapons.map((weapon) => weapon.weaponType))
  );
  weaponTypes.sort();
  const tables = [];
  for (const weaponType of weaponTypes) {
    const weaponsOfType = weapons.filter(
      (weapon) => weapon.weaponType === weaponType
    );
    const intrinsics = Array.from(
      new Set(weaponsOfType.map((weapon) => weapon.intrinsicPerk))
    );
    intrinsics.sort();
    const damageTypes = Array.from(
      new Set(weaponsOfType.map((weapon) => weapon.damageType))
    );
    damageTypes.sort();

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
        const matchingWeaponNames = Array.from(
          new Set(matchingWeapons.map((weapon) => weapon.name))
        );
        matchingWeaponNames.sort();
        row.set(damageType, matchingWeaponNames);
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
                        ? weapons
                        : `
                          <ul>
                            ${weapons
                              .map((weapon) => `<li>${weapon}</li>`)
                              .join("\n")}
                          </ul>
                        `;
                    return index === 0
                      ? `<th scope="row">${val}</th>`
                      : `<td>${val}</td>`;
                  })
                  .join("\n")}
              </tr>
            `
          )
          .join("\n")}
      </table>
    `;
    tables.push(html);
  }

  const fullPage = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Destiny 2 Damage Types vs. Weapon Frames</title>
      <style>
        :root {
          color-scheme: light dark;
        }

        body {
          font-size: 18px;
          max-width: 1400px;
          margin: auto;
        }

        table,
        td,
        th {
          border: 1px solid CanvasText;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 3em;
        }

        caption {
          font-size: 3em;
        }
      </style>
  </head>
  <body>
      ${tables.join("\n")}
  </body>
  </html>
  `;
  await fs.writeFile("./index.html", fullPage);
};

main().catch(console.error);
