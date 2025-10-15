<?php
	/* Pathfinder rule system
	 */
	class pathfinder2_rule_system extends rule_system {
		protected $modules = array(RS_HITPOINTS, RS_ARMOR_CLASS, RS_COMBAT_TRACKER, RS_SPELL_EFFECT_AREA);

		protected $conditions = array("blinded", "broken", "clumsy", "concealed", "confused",
			"controlled", "dazzled", "deafened", "doomed", "drained", "dying", "encumbered",
			"enfeebled", "fascinated", "fatiged", "flat-footed", "fleeing", "friendly",
			"frightened", "grabbed", "helpful", "hidden", "hostile", "immobilized",
			"indifferent", "invisible", "observed", "paralyzed", "persistent damage",
			"petrified", "prone", "quickened", "restrained", "sickened", "slowed", "stunned",
			"stupefied", "unconscious", "undetected", "unfriendly", "unnoticed", "wounded");

		protected $javascripts_adventure = array("d20_ac");

		public function character_valid_values($character) {
			$result = true;

			if ($this->valid_number($character["hitpoints"], "Hit points", 1, 1000) == false) {
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
