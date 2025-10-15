<?php
	class vault_map_arrange_model extends cauldron_model {
		public function get_adventure($adventure_id) {
			$query = "select * from adventures where id=%d and dm_id=%d";

			if (($adventures = $this->db->execute($query, $adventure_id, $this->user->id)) == false) {
				return false;
			}

			return $adventures[0];
		}

		public function get_map($map_id) {
			if (($map = $this->db->entry("maps", $map_id)) == false) {
				return false;
			}

			$parts = explode(".", $map["url"]);
			$extension = array_pop($parts);

			if (in_array($extension, config_array(MAP_VIDEO_EXTENSIONS))) {
				$map["type"] = "video";
			} else {
				$map["type"] = "image";
			}

			return $map;
		}

		private function place_characters($adventure_id, $map_id) {
			$query = "select l.character_id from adventure_character l, characters c ".
					 "where l.character_id=c.id and adventure_id=%d order by c.name";

			if (($characters = $this->db->execute($query, $adventure_id)) === false) {
				return false;
			}

			$data = array(
				"id"     => null,
				"map_id" => $map_id,
				"pos_x"	 => 1,
				"pos_y"	 => 1,
				"hidden" => NO,
				"light"  => 0);

			foreach ($characters as $character) {
				$data["character_id"] = $character["character_id"];
				if ($this->db->insert("map_character", $data) == false) {
					return false;
				}
				$data["pos_x"]++;
			}

			return true;
		}

		public function get_available_tokens() {
			$query = "select * from tokens where organisation_id=%d order by name";

			return $this->db->execute($query, $this->user->organisation_id);
		}

		public function get_blinders($map_id) {
			$query = "select * from blinders where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_characters($map_id) {
			$query = "select c.*, i.id as instance_id, i.pos_x, i.pos_y, i.hidden, i.rotation ".
			         "from characters c, map_character i ".
			         "where c.id=i.character_id and i.map_id=%d order by id desc";

			return $this->db->execute($query, $map_id);
		}

		public function get_conditions() {
			$conditions = array();

			foreach (CONDITIONS_GENERIC as $i => $condition) {
				array_push($conditions, array(
					"id"   => ($i + 1),
					"name" => $condition));
			}

			return $conditions;
		}

		public function get_doors($map_id) {
			$query = "select * from doors where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_lights($map_id) {
			$query = "select * from lights where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_tokens($map_id) {
			$custom = "";
			for ($i = 0; $i < TOKEN_CUSTOM_OPTIONS; $i++) {
				$custom .= "i.custom".$i.", ";
			}

			$query = "select t.id, t.name as type, t.width, t.height, t.extension, i.id as instance_id, i.name, t.type as token_type, ".$custom.
			         "i.known, i.pos_x, i.pos_y, i.rotation, i.hidden, i.armor_class, i.hitpoints, i.damage from tokens t, map_token i ".
			         "where t.id=i.token_id and i.map_id=%d order by i.id";

			return $this->db->execute($query, $map_id);
		}

		public function get_walls($map_id) {
			$query = "select * from walls where map_id=%d";

			return $this->db->execute($query, $map_id);
		}

		public function get_zones($map_id) {
			$query = "select * from zones where map_id=%d";

			return $this->db->execute($query, $map_id);
		}
	}
?>
