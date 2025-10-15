var sources = {
	'AI': 'Acquisitions Incorporated',
	'AitFR-DN': 'Adventures in the Forgotten Realms: Deepest Night',
	'AitFR-FCD': 'Adventures in the Forgotten Realms: From Cyan Depths',
	'AitFR-ISF': 'Adventures in the Forgotten Realms: In Scarlet Flames',
	'AitFR-THP': 'Adventures in the Forgotten Realms: In Scarlet Flames',
	'AWM': 'Adventure with Muk',
	'BAM': 'Boo\'s Astral Menagerie',
	'BGDIA': 'Baldur\'s Gate: Descent Into Avernus',
	'CM': 'Candlekeep Mysteries',
	'CoS': 'Curse of Strahd',
	'CRCotN': 'Critical Role: Call of the Netherdeep',
	'DC': 'Divine Contention',
	'DIP': 'Dragon of Icespire Peak',
	'DMG': 'Dungeon Master\'s Guide',
	'DoD': 'Domains of Delight',
	'DoSI': 'Dragons of Stormwreck Isle',
	'EGW': 'Explorer\'s Guide to Wildemount',
	'ERLW': 'Eberron: Rising from the Last War',
	'ESK': 'Essentials Kit',
	'FTD': 'Fizban\'s Treasury of Dragons',
	'GGR': 'Guildmasters\' Guide to Ravnica',
	'GoS': 'Ghosts of Saltmarsh',
	'HftT': 'Hunt for the Thessalhydra',
	'HoL': 'The House of Lament',
	'HotDQ': 'Hoard of the Dragon Queen',
	'IDRotF': 'Icewind Dale: Rime of the Frostmaiden',
	'IMR': 'Infernal Machine Rebuild',
	'JttRC': 'Journeys through the Radiant Citadel',
	'KKW': 'Krenko\'s Way',
	'LLK': 'Lost Laboratory of Kwalish',
	'LMoP': 'Lost Mine of Phandelver',
	'LoX': 'Light of Xaryxis',
	'LR': 'Locathah Rising',
	'MaBJoV': 'Minsc and Boo\'s Journal of Villainy',
	'MCV1SC': 'MCVX_PREFIX 1: Spelljammer Creatures',
	'MFF': 'Mordenkainen\'s Fiendish Folio',
	'MGELFT': 'Muk\'s Guide To Everything He Learned From Tasha',
	'MM': 'Monster Manual',
	'MOT': 'Mythic Odysseys of Theros',
	'MPMM': 'Mordenkainen Presents: Monsters of the Multiverse',
	'MTF': 'Mordenkainen\'s Tome of Foes',
	'NRH-ASS': 'NERDS Restoring Harmony: A Sticky Situation',
	'NRH-AT': 'NERDS Restoring Harmony: Adventure Together',
	'NRH-AVitW': 'NERDS Restoring Harmony: A Voice in the Wilderness',
	'NRH-AWoL': 'NERDS Restoring Harmony: A Web of Lies',
	'NRH-CoI': 'NERDS Restoring Harmony: Circus of Illusions',
	'NRH-TCMC': 'NERDS Restoring Harmony: The Candy Mountain Caper',
	'OotA': 'Out of the Abyss',
	'OoW': 'The Orrery of the Wanderer',
	'PHB': 'Player\'s Handbook',
	'PotA': 'Princes of the Apocalypse',
	'PSA': 'Plane Shift: Amonkhet',
	'PSD': 'Plane Shift: Dominaria',
	'PSI': 'Plane Shift: Innistrad',
	'PSK': 'Plane Shift: Kaladesh',
	'PSX': 'Plane Shift: Ixalan',
	'PSZ': 'Plane Shift: Zendikar',
	'RMBRE': 'The Lost Dungeon of Rickedness: Big Rick Energy',
	'RoT': 'The Rise of Tiamat',
	'RtG': 'Return to Glory',
	'SADS': 'Sapphire Anniversary Dice Set',
	'SCC': 'Strixhaven: A Curriculum of Chaos',
	'SDW': 'Sleeping Dragon\'s Wake',
	'SKT': 'Storm King\'s Thunder',
	'SLW': 'Storm Lord\'s Wrath',
	'TCE': 'Tasha\'s Cauldron of Everything',
	'TftYP': 'Tales from the Yawning Portal',
	'ToA': 'Tomb of Annihilation',
	'TTP': 'The Tortle Package',
	'UA2020SpellsAndMagicTattoos': 'Unearthed Arcana: 2020 Spells and Magic Tattoos',
	'UA2020SubclassesPt2': 'Unearthed Arcana: 2020 Subclasses, Part 2',
	'UA2020SubclassesPt5': 'Unearthed Arcana: 2020 Subclasses, Part 5',
	'UA2021DraconicOptions': 'Unearthed Arcana: 2021 Draconic Options',
	'UA2021MagesOfStrixhaven': 'Unearthed Arcana: 2021 Mages of Strixhaven',
	'UA2022GiantOptions': 'Unearthed Arcana: 2022 Giant options',
	'UA2022WondersOfTheMultiverse': 'Unearthed Arcana: 2022 Wonders of the Multiverse',
	'UAArtificerRevisited': 'Unearthed Arcana: Artificer Revisited',
	'UAClassFeatureVariants': 'Unearthed Arcana: \'Class Feature Variants',
	'UAClericDruidWizard': 'Unearthed Arcana: Cleric, Druid and Wizard',
	'VD': 'Vecna Dossier',
	'VGM': 'Volo\'s Guide to Monsters',
	'VRGR': 'Van Richten\'s Guide to Ravenloft',
	'WBtW': 'The Wild Beyond the Witchlight',
	'WDH': 'Waterdeep: Dragon Heist',
	'WDMM': 'Waterdeep: Dungeon of the Mad Mage',
	'XGE': 'Xanathar\'s Guide to Everything'
};

function create_monster_list(monsters) {
	var monster_list = $('div.monsters');

	monster_list.append('<label>Dungeons &amp; Dragons 5e monsters:</label>');

	monsters.forEach(function(monster) {
		var record = '<div class="well" name="' + monster.name.toLowerCase() + '" hp="' + monster.hp + '" ac="' + monster.ac + '" size="' + monster.size + '">'
		record += '<div>' + monster.name + '</div>'
		record += '<div>Armor class: ' + monster.ac + ', hit points: ' + monster.hp + '</div>'
		record += '<div>Source: ' + sources[monster.source]
		if (monster.page != '?') {
			record += ', page: ' + monster.page
		}
		record += '</div>'
		record += '</div>'

		monster_list.append(record)
	});

	/* Filter monster list
	 */
	$('input#name').on('keyup', function() {
		var filter = $(this).val().toLowerCase();
	
		$('div.monsters div.well').each(function() {
			if ($(this).attr('name').includes(filter)) {
				$(this).show();
			} else {
				$(this).hide();
			}
		});
	});

	if ($('input#name').val() != '') {
		$('input#name').trigger('keyup');
	}

	/* Click monster record
	 */
	$('div.monsters div.well').on('click', function() {
		$('input#name').val($(this).find('div').first().text());
		$('input#hitpoints').val($(this).attr('hp'));
		$('input#armor_class').val($(this).attr('ac'));

		if ($(this).attr('size') == 'L') {
			var size = 2;
		} else if ($(this).attr('size') == 'H') {
			var size = 3;
		} else {
			var size = 1;
		}

		$('input#width').val(size);
		$('input#height').val(size);
	});
}

$(document).ready(function() {
	$.get('/data/monsters', function(monsters) {
		create_monster_list(JSON.parse($(monsters).text()));
	});
});
