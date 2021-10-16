require("dotenv").config();
const fetch = require("./fetch");

const commonHeaders = {
  "User-Agent":
    "Element Frame Tables/1.0 AppId/42590 (+#;noelle_leigh@fastmail.com)",
  "X-API-Key": process.env.API_KEY,
};

const main = async () => {
  const manifest = await fetch(
    "https://www.bungie.net/Platform/Destiny2/Manifest/",
    {
      headers: commonHeaders,
    }
  ).then((res) => res.json());

  const itemDefinitionCategoriesUrl =
    manifest.Response.jsonWorldComponentContentPaths.en
      .DestinyItemCategoryDefinition;
  const itemDefinitionCategories = await fetch(
    `https://www.bungie.net${itemDefinitionCategoriesUrl}`,
    { headers: commonHeaders }
  ).then((res) => res.json());
  console.log(JSON.stringify(itemDefinitionCategories, null, 2));

  const itemDefinitionUrl =
    manifest.Response.jsonWorldComponentContentPaths.en
      .DestinyInventoryItemDefinition;
  // const itemDefinitions = await fetch(
  //   `https://www.bungie.net${itemDefinitionUrl}`,
  //   { headers: commonHeaders }
  // ).then((res) => res.json());
  // console.log(itemDefinitions.length);
};

if (require.main === module) {
  main().catch(console.error);
}
