<?php
	class relations_model extends cauldron_model {
		private function valid_adventure_id($adventure_id) {	
			$query = "select count(*) AS count from adventures a ".
			         "left join adventure_character l ON l.adventure_id=a.id ".
			         "left join characters c ON c.id=l.character_id ".
			         "where a.dm_id=%d OR c.user_id=%d";

			if (($result = $this->db->execute($query, $this->user->id, $this->user->id)) == false) {
				return false;
			}

			return $result[0]["count"] > 0;
		}

		private function valid_entity_id($entity_id) {
			$entity_ids = null;

			if ($entity_ids === null) {
				$query = "select adventure_id from relation_entities where id=%d";
				if (($entities = $this->db->execute($query, $entity_id)) == false) {
					return false;
				}
				$adventure_id = $entities[0]["adventure_id"];

				if ($this->valid_adventure_id($adventure_id) == false) {
					return false;
				}
				
				$query = "select id from relation_entities where adventure_id=%d";
				if (($entities = $this->db->execute($query, $adventure_id)) === false) {
					return false;
				}

				$entity_ids = array();
				foreach ($entities as $entity) {
					array_push($entity_ids, $entity["id"]);
				}
			}

			return in_array($entity_id, $entity_ids);
		}

		/* Entities
		 */
		public function get_entities($adventure_id) {
			if ($this->valid_adventure_id($adventure_id) == false) {	
				return false;
			}

			$query = "select * from relation_entities where adventure_id=%d order by title";

			return $this->db->execute($query, $adventure_id);
		}

		public function get_entity($entity_id) {
			if (($entity = $this->db->entry("relation_entities", $entity_id)) == false) {
				return false;
			}

			if ($this->valid_adventure_id($entity["adventure_id"]) == false) {	
				return false;
			}

			return $entity;
		}

		public function save_entity_okay($entity) {
			$result = true;

			if (trim($entity["title"]) == "") {	
				$this->view->add_message("Specify the title.");
				$result = false;
			}

			return $result;
		}

		public function create_entity($entity) {
			if ($this->valid_adventure_id($entity["adventure_id"]) == false) {
				return false;
			}

			$keys = array("id", "adventure_id", "title", "description", "color", "pos_x", "pos_y");

			$entity["id"] = null;
			$entity["pos_x"] = 0;
			$entity["pos_y"] = 0;

			if ($this->db->insert("relation_entities", $entity, $keys) === false) {
				return false;
			}

			return $entity["adventure_id"];
		}

		public function update_entity($entity) {
			if (($current = $this->get_entity($entity["id"])) == false) {
				return false;
			}

			$keys = array("title", "description", "color");

			if ($this->db->update("relation_entities", $entity["id"], $entity, $keys) === false) {	
				return false;
			}

			return $current["adventure_id"];
		}

		public function move_entity($entity) {
			if (($current = $this->get_entity($entity["id"])) == false) {
				return false;
			}

			$keys = array("pos_x", "pos_y");

			return $this->db->update("relation_entities", $entity["id"], $entity, $keys);
		}

		public function delete_entity($entity_id) {
			if (($current = $this->get_entity($entity_id)) == false) {
				return false;
			}

			$queries = array(
				array("delete from relation_connections where from_entity_id=%d", $entity_id),
				array("delete from relation_connections where to_entity_id=%d", $entity_id),
				array("delete from relation_entities where id=%d", $entity_id));

			if ($this->db->transaction($queries) == false) {
				return false;
			}

			return $current["adventure_id"];
		}

		/* Connections
		 */
		public function get_connections($adventure_id) {
			if ($this->valid_adventure_id($adventure_id) == false) {	
				return false;
			}

			$query = "select distinct c.* from relation_connections c, relation_entities e ".
			         "where (c.from_entity_id=e.id or c.to_entity_id=e.id) and e.adventure_id=%d";

			return $this->db->execute($query, $adventure_id);
		}

		public function get_connection($connection_id) {
			$query = "select c.*, e.adventure_id from relation_connections c, relation_entities e ".
			         "where c.from_entity_id=e.id and c.id=%d";
			if (($connections = $this->db->execute($query, $connection_id)) == false) {
				return false;
			}
			$connection = $connections[0];

			if ($this->valid_adventure_id($connection["adventure_id"]) == false) {	
				return false;
			}

			return $connection;
		}

		public function save_connection_okay($connection) {
			$result = true;

			if ($connection["from_entity_id"] == $connection["to_entity_id"]) {
				$this->view->add_message("The from and to must be different entities.");
				$result = false;
			}

			$query = "select * from relation_connections where ((from_entity_id=%d and to_entity_id=%d) or (to_entity_id=%d and from_entity_id=%d))";
			$args = array($connection["from_entity_id"], $connection["to_entity_id"], $connection["from_entity_id"], $connection["to_entity_id"]);

			if (isset($connection["id"])) {
				$query .= " and id!=%d";
				array_push($args, $connection["id"]);
			}

			if (($existing = $this->db->execute($query, $args)) != false) {
				$this->view->add_message("A relation between those entities has already been defined.");
				$result = false;
			}

			return $result;
		}

		public function create_connection($connection) {
			if ($this->valid_entity_id($connection["from_entity_id"]) == false) {
				return false;
			} else if ($this->valid_entity_id($connection["to_entity_id"]) == false) {
				return false;
			}

			$keys = array("id", "from_entity_id", "to_entity_id", "description", "color", "type");

			$connection["id"] = null;

			if ($this->db->insert("relation_connections", $connection, $keys) === false) {
				return false;
			}

			return $connection["adventure_id"];
		}

		public function update_connection($connection) {
			if (($current = $this->get_connection($connection["id"])) == false) {
				return false;
			}

			if ($this->valid_entity_id($current["from_entity_id"]) == false) {
				return false;
			} else if ($this->valid_entity_id($connection["from_entity_id"]) == false) {
				return false;
			} else if ($this->valid_entity_id($connection["to_entity_id"]) == false) {
				return false;
			}

			$keys = array("from_entity_id", "to_entity_id", "description", "color", "type");

			if ($this->db->update("relation_connections", $connection["id"], $connection, $keys) === false) {	
				return false;
			}

			return $current["adventure_id"];
		}

		public function delete_connection($connection_id) {
			if (($current = $this->get_connection($connection_id)) == false) {
				return false;
			}

			if ($this->db->delete("relation_connections", $connection_id) == false) {
				return false;
			}

			return $current["adventure_id"];
		}
	}
?>
