<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	class register_model extends Banshee\splitform_model {
		const MINIMUM_USERNAME_LENGTH = 4;
		const MINIMUM_FULLNAME_LENGTH = 4;

		protected $forms = array(
			"invitation" => array("invitation"),
			"email"      => array("email"),
			"code"       => array("code"),
			"account"    => array("fullname", "username", "password", "organisation"));

		public function reset_form_progress() {
			unset($_SESSION["register_email"]);
			unset($_SESSION["register_code"]);

			parent::reset_form_progress();
		}

		public function validate_invitation($data) {
			if (empty($data["invitation"])) {
				return true;
			}

			if (strpos($data["invitation"], "-") === false) {
				$this->view->add_message("Invalid invitation code.");
				return false;
			}

			list($id, $code) = explode("-", $data["invitation"]);

			$query = "select * from organisations where id=%d and invitation_code=%s";
			if ($this->db->execute($query, $id, $code) == false) {
				$this->view->add_message("Invalid invitation code.");
				return false;
			}

			return true;
		}

		public function validate_email($data) {
			$result = true;

			if (valid_email($data["email"]) == false) {
				$this->view->add_message("Invalid e-mail address.");
				$result = false;
			}

			$query = "select * from users where email=%s";
			if ($this->db->execute($query, $data["email"]) != false) {
				$this->view->add_message("The e-mail address has already been used to register an account.");
				$result = false;
			}

			return $result;
		}

		public function validate_code($data) {
			if (trim($data["code"]) != $_SESSION["register_code"]) {
				$this->view->add_message("Invalid verification code.");
				return false;
			}

			return true;
		}

		public function validate_account($data) {
			$result = true;

			$length_okay = (strlen($data["username"]) >= self::MINIMUM_USERNAME_LENGTH);
			$format_okay = valid_input($data["username"], VALIDATE_NONCAPITALS.VALIDATE_NUMBERS."@.-", VALIDATE_NONEMPTY);

			if (($length_okay == false) || ($format_okay == false)) {
				$this->view->add_message("Your username must consist of lowercase letters with a minimum length of %d characters.", self::MINIMUM_USERNAME_LENGTH);
				$result = false;
			}

			$query = "select * from users where username=%s";
			if ($this->db->execute($query, $data["username"]) != false) {
				$this->view->add_message("The username is already taken.");
				$result = false;
			}

			if (is_secure_password($data["password"], $this->view) == false) {
				$result = false;
			}

			if (strlen($data["fullname"]) < self::MINIMUM_FULLNAME_LENGTH) {
				$this->view->add_message("The length of your name must be equal or greater than %d.", self::MINIMUM_FULLNAME_LENGTH);
				$result = false;
			}

			return $result;
		}

		public function process_form_data($data) {
			$user_is_dm = empty($data["invitation"]);

			if ($user_is_dm) {
				$query = "select max(id) as id from organisations";
				if (($result = $this->db->execute($query)) == false) {
					return false;
				}

				$organisation = array(
					"name"          => "Group ".($result[0]["id"] + 1),
					"max_resources" => $this->settings->default_max_resources);

				if (($organisation_id = $this->borrow("vault/organisation")->create_organisation($organisation)) === false) {
					return false;
				}

				$roles = array(USER_MAINTAINER_ROLE_ID, PLAYER_ROLE_ID, DUNGEON_MASTER_ROLE_ID);
			} else {
				list($organisation_id) = explode("-", $data["invitation"]);

				$roles = array(PLAYER_ROLE_ID);
			}

			$user = array(
				"organisation_id" => $organisation_id,
				"username"        => $data["username"],
				"password"        => $data["password"],
			    "status"          => USER_STATUS_ACTIVE,
				"fullname"        => $data["fullname"],
				"email"           => $data["email"],
				"roles"           => $roles);

			if ($this->borrow("vault/user")->create_user($user, true) == false) {
				if ($user_is_dm) {
					$this->borrow("vault/organisation")->delete_organisation($organisation_id);
					$this->db->query("alter table organisations auto_increment=%d", 1);
				}
				return false;
			}

			$this->user->log_action("user %s registered", $data["username"]);

			unset($_SESSION["register_email"]);
			unset($_SESSION["register_code"]);

			$email = new cauldron_email("New account registered at ".$_SERVER["SERVER_NAME"], $this->settings->webmaster_email);
			$email->set_message_fields(array(
				"FULLNAME" => $data["fullname"],
				"EMAIL"    => $data["email"],
				"USERNAME" => $data["username"],
				"GROUP"    => "Group ".$organisation_id,
				"WEBSITE"  => $this->settings->head_title,
				"IP_ADDR"  => $_SERVER["REMOTE_ADDR"],
				"DM"       => show_boolean($user_is_dm)));
			$email->message(file_get_contents("../extra/account_registered.txt"));
			$email->send($this->settings->webmaster_email, "Cauldron VTT");

			return true;
		}
	}
?>
