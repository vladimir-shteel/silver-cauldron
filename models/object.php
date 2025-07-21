<?php
	class object_model extends Banshee\api_model {
		private function valid_adventure_id($adventure_id) {
			if (isset($_SESSION["valid_adventure_id"]) == false) {
				$_SESSION["valid_adventure_id"] = array();
			}

			if (in_array($adventure_id, $_SESSION["valid_adventure_id"])) {
				return true;
			}

			$query = "select count(*) as count from adventures a ".
			         "left join adventure_character i on a.id=i.adventure_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where a.id=%d and (a.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $adventure_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			if ($result[0]["count"] == 0) {
				return false;
			}

			array_push($_SESSION["valid_adventure_id"], $adventure_id);

			return true;
		}

		public function save_player_notes($adventure_id, $notes) {
			if ($this->valid_adventure_id($adventure_id) == false) {
				return false;
			}

			$data = array("notes" => substr($notes, 0, 255));

			return $this->db->update("adventures", $adventure_id, $data) !== false;
		}

		/* Map functions
		 */
		private function valid_map_id($map_id) {
			$query = "select count(*) as count from maps m, adventures a ".
			         "where m.adventure_id=a.id and m.id=%d and a.dm_id=%d";

			if (($result = $this->db->execute($query, $map_id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function change_map($adventure_id, $map_id) {
			if ($this->valid_map_id($map_id) == false) {
				return false;
			}

			$query = "update adventures set active_map_id=%d where id=%d and dm_id=%d";

			return $this->db->query($query, $map_id, $adventure_id, $this->user->id) != false;
		}

		/* Start functions
		 */
		public function start_move($map_id, $pos_x, $pos_y) {
			if ($this->valid_map_id($map_id) == false) {
				return false;
			} else if (($pos_x < 0) || ($pos_y < 0)) {
				return false;
			}

			$query = "update maps set start_x=%d, start_y=%d where id=%d";

			return $this->db->query($query, $pos_x, $pos_y, $map_id) != false;
		}

		/* Token functions
		 */
		private function valid_token_instance_id($instance_id) {
			if (isset($_SESSION["valid_instance_id"]) == false) {
				$_SESSION["valid_instance_id"] = array();
			}

			if (in_array($instance_id, $_SESSION["valid_instance_id"])) {
				return true;
			}

			$query = "select count(*) as count ".
			         "from map_token t, maps m, adventures a ".
			         "left join adventure_character i on a.id=i.adventure_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where t.id=%d and t.map_id=m.id and m.adventure_id=a.id ".
			         "and (a.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $instance_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			if ($result[0]["count"] == 0) {
				return false;
			}

			array_push($_SESSION["valid_instance_id"], $instance_id);

			return true;
		}

		public function token_armor_class($instance_id, $armor_class) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$query = "update map_token set armor_class=%d where id=%d";
			return $this->db->query($query, $armor_class, $instance_id) !== false;
		}

		public function token_create($token) {
			if ($this->valid_map_id($token["map_id"]) == false) {
				return false;
			}

			$data = array(
				"id"          => null,
				"map_id"      => (int)$token["map_id"],
				"token_id"    => (int)$token["token_id"],
				"name"        => null,
				"known"       => YES,
				"pos_x"       => (int)$token["pos_x"],
				"pos_y"       => (int)$token["pos_y"],
				"rotation"    => 0,
				"hidden"      => NO,
				"armor_class" => 10,
				"hitpoints"   => 0,
				"damage"      => 0);

			if ($this->db->insert("map_token", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function token_damage($instance_id, $damage) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			if (($current = $this->db->entry("map_token", $instance_id)) == false) {
				return false;
			}

			if ($damage > $current["hitpoints"]) {
				$damage = $current["hitpoints"];
			} else if ($damage < 0) {
				$damage = 0;
			}

			$query = "update map_token set damage=%d where id=%d";

			return $this->db->query($query, $damage, $instance_id) !== false;
		}

		public function token_delete($instance_id) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$queries = array(
				array("update collectables set map_token_id=null where map_token_id=%d", $instance_id),
				array("delete from map_token where id=%d", $instance_id));

			return $this->db->transaction($queries) != false;
		}

		public function token_hide($instance_id, $hidden) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		public function token_hitpoints($instance_id, $hitpoints) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$query = "update map_token set hitpoints=%d where id=%d";
			return $this->db->query($query, $hitpoints, $instance_id) !== false;
		}

		public function token_move($instance_id, $pos_x, $pos_y) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			} else if (($pos_x < 0) || ($pos_y < 0)) {
				return false;
			}

			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		public function token_name($instance_id, $name) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$name = substr(trim($name), 0, 50);

			$data = array("name" => ($name != "") ? $name : null);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		public function token_known($instance_id, $known) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("known" => is_true($known) ? YES : NO);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		public function token_rotate($instance_id, $direction) {
			if ($this->valid_token_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("rotation" => (int)$direction);
			return $this->db->update("map_token", $instance_id, $data) !== false;
		}

		/* Blinder functions
		 */
		private function valid_blinder_id($blinder_id) {
			$query = "select count(*) as count from blinders w, maps m, adventures a ".
			         "where w.id=%d and w.map_id=m.id and m.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $blinder_id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function blinder_create($blinder) {
			if ($this->valid_map_id($blinder["map_id"]) == false) {
				return false;
			}

			if (($blinder["pos1_x"] == $blinder["pos2_x"]) && ($blinder["pos1_y"] == $blinder["pos2_y"])) {
				return false;
			}

			$query = "select * from maps where id=%d";
			if (($maps = $this->db->execute($query, $blinder["map_id"])) == false) {
				return false;
			}
			$grid_size = (int)$maps[0]["grid_size"];

			$fields = array("pos1_x", "pos1_y", "pos2_x", "pos2_y");
			foreach ($fields as $field) {
				$blinder[$field] = $blinder[$field] * $grid_size / $this->settings->screen_grid_size;
			}

			$data = array(
				"id"     => null,
				"map_id" => (int)$blinder["map_id"],
				"pos1_x" => $blinder["pos1_x"],
				"pos1_y" => $blinder["pos1_y"],
				"pos2_x" => $blinder["pos2_x"],
				"pos2_y" => $blinder["pos2_y"]);

			if ($this->db->insert("blinders", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function blinder_delete($blinder_id) {
			if ($this->valid_blinder_id($blinder_id) == false) {
				return false;
			}

			return $this->db->delete("blinders", $blinder_id) !== false;
		}

		/* Character functions
		 */
		private function valid_character_instance_id($instance_id) {
			if (isset($_SESSION["valid_character_instance_id"]) == false) {
				$_SESSION["valid_character_instance_id"] = array();
			}

			if (in_array($instance_id, $_SESSION["valid_character_instance_id"])) {
				return true;
			}

			$query = "select count(*) as count ".
			         "from map_character h, maps m, adventures a, adventure_character p, characters c ".
			         "where h.map_id=m.id and m.adventure_id=a.id and a.id=p.adventure_id and p.character_id=c.id ".
			         "and h.character_id=c.id and h.id=%d and (a.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $instance_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			if ($result[0]["count"] == 0) {
				return false;
			}

			array_push($_SESSION["valid_character_instance_id"], $instance_id);

			return true;
		}

		private function get_character($instance_id) {
			$query = "select c.* from characters c, map_character i ".
			         "where c.id=i.character_id and i.id=%d";
			if (($characters = $this->db->execute($query, $instance_id)) == false) {
				return false;
			}

			return $characters[0];
		}

		public function character_armor_class($instance_id, $armor_class) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			if (($character = $this->get_character($instance_id)) == false) {
				return false;
			}

			$data = array("armor_class" => $armor_class);
			return $this->db->update("characters", $character["id"], $data) !== false;
		}

		public function character_damage($instance_id, $damage) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			if (($character = $this->get_character($instance_id)) == false) {
				return false;
			}

			if ($damage > $character["hitpoints"]) {
				$damage = $character["hitpoints"];
			} else if ($damage < 0) {
				$damage = 0;
			}

			$query = "update characters set damage=%d where id=%d";

			return $this->db->query($query, $damage, $character["id"]) !== false;
		}

		public function character_hide($instance_id, $hidden) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("hidden" => is_true($hidden) ? YES : NO);
			return $this->db->update("map_character", $instance_id, $data) !== false;
		}

		public function character_hitpoints($instance_id, $hitpoints) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			if (($character = $this->get_character($instance_id)) == false) {
				return false;
			}

			$data = array("hitpoints" => $hitpoints);
			return $this->db->update("characters", $character["id"], $data) !== false;
		}

		public function character_light($instance_id, $radius) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("light" => (int)$radius);
			return $this->db->update("map_character", $instance_id, $data) !== false;
		}

		public function character_move($instance_id, $pos_x, $pos_y) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			} else if (($pos_x < 0) || ($pos_y < 0)) {
				return false;
			}

			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("map_character", $instance_id, $data) !== false;
		}

		public function character_rotate($instance_id, $direction) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			$data = array("rotation" => (int)$direction);
			return $this->db->update("map_character", $instance_id, $data) !== false;
		}

		public function character_vision($instance_id, $vision) {
			if ($this->valid_character_instance_id($instance_id) == false) {
				return false;
			}

			if (($character = $this->get_character($instance_id)) == false) {
				return false;
			}

			$data = array("vision" => (int)$vision);
			return $this->db->update("characters", $character["id"], $data) !== false;
		}

		/* Door functions
		 */
		private function valid_door_id($door_id) {
			$query = "select count(*) as count from doors d, maps m, adventures a ".
			         "where d.id=%d and d.map_id=m.id and m.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $door_id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function door_create($door) {
			if ($this->valid_map_id($door["map_id"]) == false) {
				return false;
			}

			if ($door["length"] == 0) {
				return false;
			}

			$data = array(
				"id"        => null,
				"map_id"    => (int)$door["map_id"],
				"pos_x"     => (int)$door["pos_x"],
				"pos_y"     => (int)$door["pos_y"],
				"length"    => (int)$door["length"],
				"direction" => $door["direction"],
				"state"     => $door["state"],
				"secret"    => is_true($door["secret"]) ? YES : NO,
				"bars"      => is_true($door["bars"]) ? YES : NO);

			if ($this->db->insert("doors", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function door_state($door_id, $state) {
			if ($this->valid_door_id($door_id) == false) {
				return false;
			}

			$valid_states = array("open", "closed");
			if (in_array($state, $valid_states) == false) {
				return false;
			}

			$data = array("state" => $state);
			return $this->db->update("doors", $door_id, $data) !== false;
		}

		public function door_secret($door_id, $secret) {
			if ($this->valid_door_id($door_id) == false) {
				return false;
			}

			$data = array("secret" => is_true($secret) ? YES : NO);
			return $this->db->update("doors", $door_id, $data) !== false;
		}

		public function door_bars($door_id, $bars) {
			if ($this->valid_door_id($door_id) == false) {
				return false;
			}

			$data = array("bars" => is_true($bars) ? YES : NO);
			return $this->db->update("doors", $door_id, $data) !== false;
		}

		public function door_delete($door_id) {
			if ($this->valid_door_id($door_id) == false) {
				return false;
			}

			return $this->db->delete("doors", $door_id) !== false;
		}

		/* Light functions
		 */
		private function valid_light_id($light_id) {
			$query = "select count(*) as count from lights l, maps m, adventures a ".
			         "where l.id=%d and l.map_id=m.id and m.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $light_id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function light_create($light) {
			if ($this->valid_map_id($light["map_id"]) == false) {
				return false;
			}

			$data = array(
				"id"        => null,
				"map_id"    => (int)$light["map_id"],
				"pos_x"     => (int)$light["pos_x"],
				"pos_y"     => (int)$light["pos_y"],
				"radius"    => $light["radius"],
				"state"     => "on");

			if ($this->db->insert("lights", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function light_move($light_id, $pos_x, $pos_y) {
			if ($this->valid_light_id($light_id) == false) {
				return false;
			} else if (($pos_x < 0) || ($pos_y < 0)) {
				return false;
			}

			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("lights", $light_id, $data) !== false;
		}

		public function light_radius($light_id, $radius) {
			if ($this->valid_light_id($light_id) == false) {
				return false;
			}

			$data = array("radius" => $radius);
			return $this->db->update("lights", $light_id, $data) !== false;
		}

		public function light_state($light_id, $state) {
			if ($this->valid_light_id($light_id) == false) {
				return false;
			}

			$data = array("state" => $state);
			return $this->db->update("lights", $light_id, $data) !== false;
		}

		public function light_delete($light_id) {
			if ($this->valid_light_id($light_id) == false) {
				return false;
			}

			return $this->db->delete("lights", $light_id) !== false;
		}

		/* Wall functions
		 */
		private function valid_wall_id($wall_id) {
			$query = "select count(*) as count from walls w, maps m, adventures a ".
			         "where w.id=%d and w.map_id=m.id and m.adventure_id=a.id and a.dm_id=%d";

			if (($result = $this->db->execute($query, $wall_id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function wall_create($wall) {
			if ($this->valid_map_id($wall["map_id"]) == false) {
				return false;
			}

			if ($wall["length"] == 0) {
				return false;
			}

			$data = array(
				"id"          => null,
				"map_id"      => (int)$wall["map_id"],
				"pos_x"       => (int)$wall["pos_x"],
				"pos_y"       => (int)$wall["pos_y"],
				"length"      => (int)$wall["length"],
				"direction"   => $wall["direction"],
				"transparent" => is_true($wall["transparent"]) ? YES : NO);

			if ($this->db->insert("walls", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function wall_delete($wall_id) {
			if ($this->valid_wall_id($wall_id) == false) {
				return false;
			}

			return $this->db->delete("walls", $wall_id) !== false;
		}

		/* Zone functions
		 */
		private function valid_zone_id($zone_id) {
			$query = "select count(*) as count from zones z, maps m, adventures a ".
			         "left join adventure_character i on a.id=i.adventure_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where z.id=%d and z.map_id=m.id and m.adventure_id=a.id ".
			         "and (a.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $zone_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function zone_create($zone) {
			if ($this->valid_map_id($zone["map_id"]) == false) {
				return false;
			}

			$data = array(
				"id"       => null,
				"map_id"   => (int)$zone["map_id"],
				"pos_x"    => max((int)$zone["pos_x"], 0),
				"pos_y"    => max((int)$zone["pos_y"], 0),
				"width"    => (int)$zone["width"],
				"height"   => (int)$zone["height"],
				"color"    => $zone["color"],
				"opacity"  => $zone["opacity"],
				"script"   => "",
				"group"    => $zone["group"],
				"altitude" => (int)$zone["altitude"]);

			if ($this->db->insert("zones", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function zone_delete($zone_id) {
			if ($this->valid_zone_id($zone_id) == false) {
				return false;
			}

			return $this->db->delete("zones", $zone_id) !== false;
		}

		public function zone_move($zone_id, $pos_x, $pos_y) {
			if ($this->valid_zone_id($zone_id) == false) {
				return false;
			} else if (($pos_x < 0) || ($pos_y < 0)) {
				return false;
			}

			$data = array("pos_x" => (int)$pos_x, "pos_y" => (int)$pos_y);
			return $this->db->update("zones", $zone_id, $data) !== false;
		}

		public function script_save($zone_id, $map_id, $script, $group, $copy_script) {
			if ($this->valid_zone_id($zone_id) == false) {
				return false;
			}

			$script = trim($script);
			$group = trim($group);

			if ($copy_script && ($group != '')) {
				if ($this->valid_map_id($map_id) == false) {
					return false;
				}

				$query = "update zones set script=%s where %S=%s and map_id=%d";
				if ($this->db->query($query, $script, 'group', $group, $map_id) === false) {
					return false;
				}
			}

			$data = array("script" => $script, "group" => $group);
			return $this->db->update("zones", $zone_id, $data) !== false;
		}

		/* Collectable functions
		 */
		private function valid_collectable_id($collectable_id) {
			$query = "select count(*) as count from collectables o, adventures a ".
			         "left join adventure_character i on a.id=i.adventure_id ".
			         "left join characters c on i.character_id=c.id ".
			         "where o.id=%d and o.adventure_id=a.id and (a.dm_id=%d or c.user_id=%d)";

			if (($result = $this->db->execute($query, $collectable_id, $this->user->id, $this->user->id)) === false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		public function collectables_get_unused($adventure_id, $token_instance_id) {
			if ($this->valid_adventure_id($adventure_id) == false) {
				return false;
			}

			if ($this->valid_token_instance_id($token_instance_id) == false) {
				return false;
			}

			$query = "select id, map_token_id, name, image from collectables ".
			         "where adventure_id=%d and (map_token_id is null or map_token_id=%d) order by name";

			return $this->db->execute($query, $adventure_id, $token_instance_id);
		}

		public function collectable_place($collectable_id, $token_instance_id) {
			if ($this->valid_token_instance_id($token_instance_id) == false) {
				return false;
			}

			$query = "update collectables set map_token_id=null where map_token_id=%d";
			if ($this->db->query($query, $token_instance_id) === false) {
				return false;
			}

			if ($collectable_id == 0) {
				return true;
			}

			if ($this->valid_collectable_id($collectable_id) == false) {
				return false;
			}

			$data = array("map_token_id" => $token_instance_id);
			return $this->db->update("collectables", $collectable_id, $data);
		}

		public function collectable_found($collectable_id) {
			if ($this->valid_collectable_id($collectable_id) == false) {
				return false;
			}

			$data = array("found" => YES);

			return $this->db->update("collectables", $collectable_id, $data) !== false;
		}

		public function collectables_get_found($adventure_id) {
			if ($this->user->is_admin == false) {
				if ($this->valid_adventure_id($adventure_id) == false) {
					$query = "select access from adventures where id=%d";
					if (($adventure = $this->db->execute($query, $adventure_id)) == false) {
						return false;
					}

					if ($adventure[0]["access"] != ADVENTURE_ACCESS_PLAYERS_SPECTATORS) {
						return false;
					}
				}
			}

			$query = "select id, name, description, image, %S from collectables ".
					 "where adventure_id=%d and found=%d order by name";

			return $this->db->execute($query, "explain", $adventure_id, YES);
		}

		public function collectables_get_all($adventure_id) {
			if ($this->valid_adventure_id($adventure_id) == false) {
				return false;
			}

			$query = "select id, name, found, %S from collectables ".
			         "where adventure_id=%d order by name";

			return $this->db->execute($query, "explain", $adventure_id);
		}

		public function collectable_state($collectable_id, $field, $state) {
			if ($this->valid_collectable_id($collectable_id) == false) {
				return false;
			}

			if (in_array($field, array("found", "explain")) == false) {
				return false;
			}

			$query = "update collectables set %S=%d where id=%d";
			$this->db->query($query, $field, is_true($state) ? YES : NO, $collectable_id);
		}

		/* Journal functions
		 */
		public function journal_add($adventure_id, $content) {
			if ($this->valid_adventure_id($adventure_id) == false) {
				return false;
			}

			$data = array(
				"adventure_id" => $adventure_id,
				"user_id"      => $this->user->id,
				"content"      => $content);

			if ($this->db->insert("journal", $data) === false) {
				return false;
			}

			return $this->db->last_insert_id;
		}

		public function journal_update($entry_id, $content) {
			if ($content == "") {
				$query = "delete from journal where id=%d and user_id=%d";				

				return $this->db->query($query, $entry_id, $this->user->id) !== false;
			} else {
				$query = "update journal set content=%s where id=%d and user_id=%d";

				return $this->db->query($query, $content, $entry_id, $this->user->id) !== false;
			}
		}

		/* Alternate functions
		 */
		public function set_alternate($adventure_id, $character_id, $alternate_id) {
			$query = "select * from adventure_character a, characters c ".
			         "where a.adventure_id=%d and a.character_id=c.id and c.id=%d and c.user_id=%d";
			if (($character = $this->db->execute($query, $adventure_id, $character_id, $this->user->id)) == false) {
				return false;
			}

			$params = array();
			$query = "update adventure_character set alternate_icon_id=";
			if ($alternate_id == 0) {
			 	$query .= "null";
			} else {
				$query .= "%d";
				array_push($params, $alternate_id);
			}
			$query .= ", token_id=null where adventure_id=%d and character_id=%d";
			array_push($params, $adventure_id, $character_id);

			return $this->db->query($query, $params) !== false;
		}

		/* Shape functions
		 */
		public function set_shape($adventure_id, $character_id, $token_id) {
			$query = "select * from adventure_character c, adventures a ".
			         "where c.adventure_id=a.id and a.id=%d and c.character_id=%d and a.dm_id=%d";
			if (($character = $this->db->execute($query, $adventure_id, $character_id, $this->user->id)) == false) {
				return false;
			}

			$params = array();
			$query = "update adventure_character set token_id=";
			if ($token_id == 0) {
			 	$query .= "null";
			} else {
				$query .= "%d";
				array_push($params, $token_id);
			}
			$query .= ", alternate_icon_id=null where adventure_id=%d and character_id=%d";
			array_push($params, $adventure_id, $character_id);

			return $this->db->query($query, $params) !== false;
		}
	}
?>
