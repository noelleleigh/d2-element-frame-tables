import * as api from "./api.js";

const categoryWeapon = 1;

const weaponTypes = [
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

const main = async () => {
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
  const DestinyInventoryItemDefinition = await api.getApi(
    manifest.DestinyInventoryItemDefinition
  );
  const weapons = Object.values(DestinyInventoryItemDefinition)
    .filter(filterItemByCategory(categoryWeapon))
    .filter(filterItemByTier(4008398120)); // Legendary
  const weaponInfo = weapons
    .map((item) => {
      return {
        name: item.displayProperties.name,
        weaponType:
          DestinyItemCategoryDefinition[
            item.itemCategoryHashes.filter((hash) =>
              weaponTypes.includes(hash)
            )[0]
          ].displayProperties.name,
        damageType:
          DestinyDamageTypeDefinition[item.damageTypeHashes?.[0]]
            ?.displayProperties.name,
        intrinsicPerk: item.sockets.socketEntries
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
          )[0],
      };
    })
    .filter((item) => item.damageType !== undefined);
  console.table(weaponInfo);
};

main();
