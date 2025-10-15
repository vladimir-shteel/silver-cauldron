<?php
	/* Dungeons & Dragons 5e rule system
	 */
	class dnd5_rule_system extends rule_system {
		protected $modules = array(RS_HITPOINTS, RS_ARMOR_CLASS, RS_COMBAT_TRACKER, RS_SPELL_EFFECT_AREA);

		protected $conditions = array("blinded", "charmed", "deafened", "exhausted",
			"frightened", "grappled", "incapacitated", "invisible", "paralyzed",
			"petrified", "poisoned", "prone", "restrained", "stunned", "unconscious");

		protected $javascripts_adventure = array("d20_ac", "spells");
		protected $stylesheets_adventure = array("spells");

		public function character_valid_values($character) {
			$result = true;

			if ($this->valid_number($character["hitpoints"], "Hit points", 1, 65000) == false) {
				$result = false;
			}

			if ($this->valid_number($character["armor_class"], $this->armor_class_label, 1, 250) == false) {
				$result = false;
			}

			if ($this->valid_number($character["initiative"], $this->initiative_label, -5, 10) == false) {
				$result = false;
			}

			return $result;
		}
	}
?>
