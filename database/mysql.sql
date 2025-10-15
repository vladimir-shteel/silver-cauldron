/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.13-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: cauldron_www
-- ------------------------------------------------------
-- Server version	10.11.13-MariaDB-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `adventure_character`
--

DROP TABLE IF EXISTS `adventure_character`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `adventure_character` (
  `adventure_id` int(10) unsigned NOT NULL,
  `character_id` int(10) unsigned NOT NULL,
  `alternate_icon_id` int(10) unsigned DEFAULT NULL,
  `token_id` int(10) unsigned DEFAULT NULL,
  KEY `character_id` (`character_id`),
  KEY `alternate_icon_id` (`alternate_icon_id`),
  KEY `token_id` (`token_id`),
  KEY `adventure_id` (`adventure_id`) USING BTREE,
  CONSTRAINT `adventure_character_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`),
  CONSTRAINT `adventure_character_ibfk_2` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`),
  CONSTRAINT `adventure_character_ibfk_3` FOREIGN KEY (`alternate_icon_id`) REFERENCES `character_icons` (`id`),
  CONSTRAINT `adventure_character_ibfk_4` FOREIGN KEY (`token_id`) REFERENCES `tokens` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `adventures`
--

DROP TABLE IF EXISTS `adventures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `adventures` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `rule_system_id` int(10) unsigned NOT NULL,
  `title` varchar(50) NOT NULL,
  `image` tinytext NOT NULL,
  `introduction` text NOT NULL,
  `dm_id` int(10) unsigned NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `active_map_id` int(10) unsigned DEFAULT NULL,
  `access` tinyint(1) unsigned NOT NULL,
  `story` text NOT NULL,
  `notes` tinytext NOT NULL,
  `custom0` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dm_id` (`dm_id`),
  KEY `active_map_id` (`active_map_id`),
  KEY `rule_system_id` (`rule_system_id`),
  CONSTRAINT `adventures_ibfk_1` FOREIGN KEY (`dm_id`) REFERENCES `users` (`id`),
  CONSTRAINT `adventures_ibfk_2` FOREIGN KEY (`active_map_id`) REFERENCES `maps` (`id`),
  CONSTRAINT `adventures_ibfk_3` FOREIGN KEY (`rule_system_id`) REFERENCES `rule_systems` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `agenda`
--

DROP TABLE IF EXISTS `agenda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agenda` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `begin` datetime NOT NULL,
  `end` datetime DEFAULT NULL,
  `title` varchar(25) NOT NULL,
  `adventure_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `agenda_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `agenda_ibfk_2` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `blinders`
--

DROP TABLE IF EXISTS `blinders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `blinders` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos1_x` int(10) unsigned NOT NULL,
  `pos1_y` int(10) unsigned NOT NULL,
  `pos2_x` int(10) unsigned NOT NULL,
  `pos2_y` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `blinders_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(100) NOT NULL,
  `value` mediumtext NOT NULL,
  `timeout` datetime NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `character_icons`
--

DROP TABLE IF EXISTS `character_icons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `character_icons` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `character_id` int(10) unsigned NOT NULL,
  `name` varchar(25) NOT NULL,
  `size` tinyint(3) unsigned NOT NULL,
  `extension` varchar(4) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `character_weapons`
--

DROP TABLE IF EXISTS `character_weapons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `character_weapons` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `character_id` int(10) unsigned NOT NULL,
  `name` varchar(25) NOT NULL,
  `roll` varchar(25) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `character_id` (`character_id`),
  CONSTRAINT `character_weapons_ibfk_1` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `characters`
--

DROP TABLE IF EXISTS `characters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `characters` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `rule_system_id` int(10) unsigned NOT NULL,
  `name` varchar(20) NOT NULL,
  `initiative` smallint(6) DEFAULT NULL,
  `armor_class` tinyint(3) unsigned DEFAULT NULL,
  `hitpoints` smallint(5) unsigned DEFAULT NULL,
  `damage` smallint(5) unsigned NOT NULL,
  `custom0` smallint(6) DEFAULT NULL,
  `custom1` smallint(6) DEFAULT NULL,
  `custom2` smallint(6) DEFAULT NULL,
  `vision` tinyint(3) unsigned NOT NULL,
  `token_type` enum('topdown','portrait') NOT NULL,
  `extension` varchar(4) NOT NULL,
  `sheet` enum('none','file','url') NOT NULL,
  `sheet_url` tinytext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `rule_system_id` (`rule_system_id`),
  CONSTRAINT `characters_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `characters_ibfk_2` FOREIGN KEY (`rule_system_id`) REFERENCES `rule_systems` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collectables`
--

DROP TABLE IF EXISTS `collectables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `collectables` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `map_token_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `image` tinytext NOT NULL,
  `found` tinyint(1) NOT NULL,
  `hide` tinyint(1) NOT NULL,
  `explain` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `game_map_token_id` (`map_token_id`),
  KEY `adventure_id` (`adventure_id`) USING BTREE,
  CONSTRAINT `collectables_ibfk_1` FOREIGN KEY (`map_token_id`) REFERENCES `map_token` (`id`),
  CONSTRAINT `collectables_ibfk_2` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `custom_dice`
--

DROP TABLE IF EXISTS `custom_dice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `custom_dice` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `name` varchar(25) NOT NULL,
  `sides` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `custom_dice_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `doors`
--

DROP TABLE IF EXISTS `doors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `doors` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `length` smallint(3) unsigned NOT NULL,
  `direction` enum('horizontal','vertical') NOT NULL,
  `state` enum('open','closed') NOT NULL,
  `secret` tinyint(1) NOT NULL,
  `bars` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `doors_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `journal`
--

DROP TABLE IF EXISTS `journal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `journal` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `content` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `adventure_id` (`adventure_id`) USING BTREE,
  CONSTRAINT `journal_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`),
  CONSTRAINT `journal_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lights`
--

DROP TABLE IF EXISTS `lights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `lights` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `radius` tinyint(3) unsigned NOT NULL,
  `state` enum('off','on') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `lights_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `map_character`
--

DROP TABLE IF EXISTS `map_character`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `map_character` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `character_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `rotation` smallint(5) unsigned NOT NULL,
  `hidden` tinyint(1) NOT NULL,
  `light` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `character_id` (`character_id`),
  KEY `map_id` (`map_id`) USING BTREE,
  CONSTRAINT `map_character_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`),
  CONSTRAINT `map_character_ibfk_2` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `map_token`
--

DROP TABLE IF EXISTS `map_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `map_token` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `token_id` int(10) unsigned NOT NULL,
  `name` varchar(50) DEFAULT NULL,
  `known` tinyint(1) NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `rotation` smallint(5) unsigned NOT NULL,
  `hidden` tinyint(1) NOT NULL,
  `armor_class` tinyint(3) unsigned NOT NULL,
  `hitpoints` smallint(5) unsigned NOT NULL,
  `damage` smallint(5) unsigned NOT NULL,
  `custom0` int(11) NOT NULL,
  `custom1` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `token_id` (`token_id`),
  KEY `map_id` (`map_id`) USING BTREE,
  CONSTRAINT `map_token_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`),
  CONSTRAINT `map_token_ibfk_2` FOREIGN KEY (`token_id`) REFERENCES `tokens` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maps`
--

DROP TABLE IF EXISTS `maps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `maps` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `title` varchar(50) NOT NULL,
  `url` varchar(500) NOT NULL,
  `audio` tinytext NOT NULL,
  `width` smallint(5) unsigned NOT NULL,
  `height` smallint(3) unsigned NOT NULL,
  `offset_x` tinyint(3) unsigned NOT NULL,
  `offset_y` tinyint(3) unsigned NOT NULL,
  `grid_size` decimal(5,2) unsigned NOT NULL,
  `show_grid` tinyint(1) NOT NULL,
  `drag_character` tinyint(1) NOT NULL,
  `fog_of_war` tinyint(1) NOT NULL,
  `fow_distance` tinyint(3) unsigned NOT NULL,
  `start_x` smallint(5) unsigned NOT NULL,
  `start_y` smallint(5) unsigned NOT NULL,
  `dm_notes` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`) USING BTREE,
  CONSTRAINT `maps_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `text` varchar(100) NOT NULL,
  `link` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `menu_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `menu` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--
-- ORDER BY:  `id`

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES
(1,NULL,'Public','public'),
(2,1,'Welcome','/'),
(3,1,'About','/about'),
(4,1,'Screenshots','/screenshots'),
(5,NULL,'Private','private'),
(6,5,'Adventures','/adventure'),
(7,5,'Characters','/character'),
(8,5,'Relations','/relations'),
(9,5,'Agenda','/agenda'),
(10,5,'Manual','/manual'),
(11,5,'DM\'s Vault','/vault'),
(12,5,'Logout','/logout');
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organisations`
--

DROP TABLE IF EXISTS `organisations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `resources_key` varchar(32) NOT NULL,
  `max_resources` int(10) unsigned NOT NULL,
  `invitation_code` varchar(50) DEFAULT NULL,
  `last_login` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `name_2` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organisations`
--
-- ORDER BY:  `id`

LOCK TABLES `organisations` WRITE;
/*!40000 ALTER TABLE `organisations` DISABLE KEYS */;
INSERT INTO `organisations` VALUES
(1,'Cauldron','',500,NULL,'2023-01-01 00:00:00');
/*!40000 ALTER TABLE `organisations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `page_access`
--

DROP TABLE IF EXISTS `page_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `page_access` (
  `page_id` int(10) unsigned NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  `level` int(10) unsigned NOT NULL,
  PRIMARY KEY (`page_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `page_access_ibfk_1` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`),
  CONSTRAINT `page_access_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `page_access`
--
-- ORDER BY:  `page_id`,`role_id`

LOCK TABLES `page_access` WRITE;
/*!40000 ALTER TABLE `page_access` DISABLE KEYS */;
INSERT INTO `page_access` VALUES
(1,2,1),
(1,3,1),
(1,4,1);
/*!40000 ALTER TABLE `page_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pages`
--

DROP TABLE IF EXISTS `pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pages` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(100) NOT NULL,
  `language` varchar(2) NOT NULL,
  `layout` varchar(100) DEFAULT NULL,
  `private` tinyint(1) NOT NULL,
  `style` text DEFAULT NULL,
  `title` varchar(100) NOT NULL,
  `description` varchar(200) NOT NULL,
  `keywords` varchar(100) NOT NULL,
  `content` text NOT NULL,
  `visible` tinyint(1) NOT NULL,
  `back` tinyint(1) NOT NULL,
  `form` tinyint(1) NOT NULL,
  `form_submit` varchar(32) DEFAULT NULL,
  `form_email` varchar(100) DEFAULT NULL,
  `form_done` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `url` (`url`,`language`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pages`
--
-- ORDER BY:  `id`

LOCK TABLES `pages` WRITE;
/*!40000 ALTER TABLE `pages` DISABLE KEYS */;
INSERT INTO `pages` VALUES
(1,'/manual','en',NULL,1,'ul li a.selected {\r\n	color:#23527c;\r\n	font-weight:bold;\r\n}\r\n\r\ndiv.tokens {\r\n	float:right;\r\n	margin-left:15px;\r\n}\r\n\r\nspan.fa {\r\n	margin-right:5px;\r\n}\r\n\r\ndiv.tokens div {\r\n	display:inline-block;\r\n}\r\n\r\ndiv.tokens img {\r\n	display:block;\r\n}\r\n\r\ndiv.tokens span {\r\n	display:block;\r\n	text-align:center;\r\n}\r\n\r\n@media (min-width:768px) {\r\n	img.manual {\r\n		float:right;\r\n		margin-left:15px;\r\n	}\r\n}\r\n\r\n@media (max-width:767px) {\r\n	img.manual {\r\n 		display:block;\r\n		width:100%;\r\n	}\r\n}\r\n\r\nh2 {\r\n	color: #5385c1;\r\n	padding-bottom:3px;\r\n	border-bottom:1px solid #ff7900;\r\n}\r\n\r\nh3 {\r\n	color: #5385c1;\r\n}\r\n\r\ndiv.row h3 {\r\n	color:#333333;\r\n	margin-top:10px;\r\n}\r\n\r\ndiv.row div img {\r\n	width:100%;\r\n	margin:10px;\r\n}\r\n\r\ndiv.row div p {\r\n	text-align:center;\r\n	font-style:italic;\r\n}\r\n\r\ndiv.section {\r\n	display:none;\r\n}','Manual','Manual','manual','<script type=\"text/javascript\">\r\nfunction show_section(section) {\r\n	if (section.substr(0, 1) == \'#\') {\r\n		section = section.substr(1);\r\n	}\r\n\r\n	$(\'div.section\').hide();\r\n	$(\'div.\' + section).show();\r\n\r\n	$(\'ul li a\').removeClass(\'selected\');\r\n	$(\'ul li a[href=\"#\' + section + \'\"]\').addClass(\'selected\');\r\n}\r\n\r\n$(document).ready(function() {\r\n	if (window.location.hash.length > 0) {\r\n		show_section(window.location.hash);\r\n	}\r\n});\r\n</script>\r\n\r\n<div class=\"well\">\r\n<div class=\"row\">\r\n<div class=\"col-sm-6\">\r\n<h3>For players</h3>\r\n<ul>\r\n<li><a href=\"#character\" onClick=\"javascript:show_section($(this).attr(\'href\'))\">Creating a character</a></li>\r\n<li><a href=\"#playing\" onClick=\"javascript:show_section($(this).attr(\'href\'))\">Playing an adventure</a></li>\r\n<li><a href=\"#relations\" onClick=\"javascript:show_section($(this).attr(\'href\'))\">Creating a relations overview</a></li>\r\n</ul>\r\n</div>\r\n\r\n<div class=\"col-sm-6\">\r\n<h3>For Dungeon Masters</h3>\r\n<ul>\r\n<li><a href=\"#party\" onClick=\"javascript:show_section($(this).attr(\'href\'))\">Gathering a party</a></li>\r\n<li><a href=\"#creating\" onClick=\"javascript:show_section($(this).attr(\'href\'))\">Creating an adventure</a></li>\r\n<li><a href=\"#running\" onClick=\"javascript:show_section($(this).attr(\'href\'))\">Running an adventure</a></li>\r\n<li><a href=\"#rule_system\" onClick=\"javascript:show_section($(this).attr(\'href\'))\">Rule system support</a></li>\r\n</ul>\r\n</div>\r\n</div>\r\n</div>\r\n\r\n<div class=\"section default\">\r\n<h2>Cauldron\'s basic concept</h2>\r\n<p>What Cauldron VTT offers is tokens on a map. The dungeon master can control every token, while players only control the token representing their character. A token can be a player character, a monster, an NPC or an object. A map can be an image, a video or an empty grid on which the dungeon master can draw lines or paint textures. One or more maps that belong together form an adventure.</p>\r\n<p>By drawing constructs (walls, windows and doors) on a map, a dungeon master can limit where players can move their character to and what they can see (fog of war).</p>\r\n<p>Cauldron aims to be a direct replacement of a real tabletop. Use your character sheet, your books and other stuff as you are used to. Cauldron just offers what\'s needed to play online. This makes Cauldron VTT quickly to learn and easy to use. </p>\r\n<p>If you have any questions or need support, meet me at the <a href=\"https://discord.gg/w8FB93taYJ\" target=\"_blank\">Cauldron VTT Discord server</a>.</p>\r\n\r\n<h2>Alternative manual</h2>\r\n<p>The creator of the CauldronVTT browser extension has done a great job with writing his own <a href=\"https://extension.cauldron-vtt.net/\" target=\"_blank\">Cauldron VTT manual</a>. It goes into more detail of everything that Cauldron VTT has to offer.</p>\r\n</div>\r\n\r\n<div class=\"section character\">\r\n<h2>Creating a character</h2>\r\n<div class=\"tokens\">\r\n<div><img src=\"/files/manual/portrait.png\" /><span>Portrait</span></div>\r\n<div><img src=\"/files/manual/topdown.png\" /><span>Top-down</span></div>\r\n</div>\r\n<p>Players have to create their own character. Click on \'Characters\' in the menu bar to go to the character page. Here you can add and edit your characters. Cauldron isn\'t a tool for complete character creation. So, besides the character name and an icon, you only need to enter the values that are needed to do D20 battle calculations.</p>\r\n<p>When selecting a token image, you can use a top-down image or a portrait. When using a top-down image, make sure that it\'s looking down. Specify the right token type, as this defines the way you move your character via the keyboard, which will be explained in the next section.</p>\r\n<p>When you\'ve created a character, you can add alternate tokens for that character, by clicking on the small face icon in the upper right corner of your character panel. You can use this, for example, for characters with shape changing abilities. Alternate tokens can be normal (1×1), large (2×2) or huge (3×3).</p>\r\n<h3>D&D Beyond browser extension</h3>\r\n<p>When you have a character in D&D Beyond that you would like to use while playing an adventure in Cauldron VTT, you can use <a href=\"https://github.com/Jamster3000/cauldron20\" target=\"_blank\">this browser extension</a>. For support, go to the browser extension\'s Github page and visit the Wiki or Issues page. You can also ask for help at the Cauldron VTT Discord server.</p>\r\n</div>\r\n\r\n<div class=\"section playing\">\r\n<h2>Playing an adventure</h2>\r\n<p>You can move your character via the keys W, A, S and D. If you use a top-down token, you can rotate it via Q and E. If you\'re using a portrait token, you can move diagonally via the keys Q, E, Z and C. If your keyboard layout is other than Qwerty, you can change it in your <a href=\"/profile\">user profile</a>. Optionally, they can drag their character via the mouse, but its up to the Dungeon Master to allow that.</p>\r\n<p>Right clicking with the mouse on your or another character, a token or the map opens a menu with options. Most options should explain themselves enough, but here is some information to make your understanding of Cauldron easier and faster.</p>\r\n<p><span class=\"fa fa-warning\"></span><b>Damage:</b> The amount of damage points that you enter, are added to your current damage.</p>\r\n<p><span class=\"fa fa-medkit\"></span><b>Heal:</b> The same as damage, but the points are of course subtracted from your current damage.</p>\r\n<p><span class=\"fa fa-lock\"></span><b>Stick to / unstick:</b> Sticking to a token means that when that token moves (moved by the DM), your character also moves.</p>\r\n<p><span class=\"fa fa-shield\"></span><b>Attack:</b> This rolls a D20 dice. The attack bonus you enter is added to the result of the dice roll.</p>\r\n<p><span class=\"fa fa-map-marker\"></span><b>Set marker:</b> You can use a marker to point out spots on the map to all other players and the Dungeon Master.</p>\r\n<p><span class=\"fa fa-map-signs\"></span><b>Measure distance:</b> The distance is shown in the sidebar. Left clicking with the mouse or pressing the Escape key will stop the measuring. Holding the CTRL-key while clicking adds another ruler.</p>\r\n<p><span class=\"fa fa-magic\"></span><b>Spell effect area:</b> Use this tool to see what targets are within your spell\'s reach. Hold SHIFT to use the center of the cell your mouse currently hovers.</p>\r\n<p>The input field at the right bottom corner of the screen can be used to enter commands. Type \'/help\' to see all available commands.</p>\r\n<p>Use the journal to log notes during a session. The journal is shared between all players and the Dungeon Master.</p>\r\n<p>The Inventory shows items you have found during the adventure. Items can be found when you right click on a token and select View. You have to be close to that token, otherwise the token itself is shown.</p>\r\n</div>\r\n\r\n<div class=\"section relations\">\r\n<h2>Creating a relations overview</h2>\r\n<p>During an adventure, characters meet many NPCs, visit many places or have to deal with several items or objects. Keeping track of all of them can be quite challenging. This module helps you to keep track of all those entities and their mutual relations.</p>\r\n<p>Press the \'Add entity\' button to add a new entity. For each entity, a box shaped object will be created within the overview. The title will be shown inside that box. Double click the box to view its description or to edit or delete it.</p>\r\n<p>Press the \'Add relation\' button to add a relation between two entities. You need at least two entities within the overview to do this. Place the mouse in the middle of the line that represents the relation to see an info icon. Clicking it will allow you to edit or delete that relation.</p>\r\n<p>Holding the CTRL key while dragging an entity box, aligns it to a grid.</p>\r\n</div>\r\n\r\n<div class=\"section party\">\r\n<h2>Gathering a party</h2>\r\n<p>For your players to join your game, they also need a Cauldron VTT account. For that, you have two options.</p>\r\n<ol>\r\n<li>You create their accounts yourself. For that, click the Users icon in the DM\'s Vault.</li>\r\n<li>You set an invitation code and send it to your players. They can use it to join your group while creating an account themselves. To create an invitation code, click the Invite icon in the DM\'s Vault. When someone creates an account without using an invitation code, (s)he will create a new group and becomes Dungeon Master for that group.</li>\r\n</ol>\r\n<p>When a player has created an account without an invitation code, contact me via Discord or <a href=\"contact\">send me a message</a> with your username and your player\'s username and I will move the player\'s account to your group. Be aware that that can only be done when that person has not created any character!</p>\r\n<p>When your players have an account, they have to create a character. For that, they need to click on the <a href=\"/character\">Çharacters</a> link in the main menu bar. When all characters have been created, add them to your adventure via the <a href=\"/vault/players\">Players</a> option in the DM\'s Vault. Be aware that a character can only be active in one adventure at a time.</p>\r\n</div>\r\n\r\n<div class=\"section creating\">\r\n<h2>Creating an adventure</h2>\r\n<p>All that is needed to create an adventure, can be found in the Dungeon Master\'s Vault. To enter the Dungeon Master\'s Vault, click on the DM\'s Vault link in the menu bar. The Dungeon Master\'s Vault also has all that is needed for user and website administration. A user needs the Dungeon Master role to access the Dungeon Master\'s Vault. The adventure creation section has the following options:</p>\r\n\r\n<h3>Token administration</h3>\r\n<p>This page allows you to add monster, NPC and object tokens to Cauldron. Be aware that tokes are available for every adventure created within your group. Make sure that all Dungeon Masters in your group only make changes to an existing token if all other Dungeon Masters agree. Otherwise, a change made to a token could affect another Dungeon Master\'s adventure!</p>\r\n<p>When you upload an image for a token, make sure that it\'s a top view image. When it\'s a token for a monster or NPC, make sure that it\'s looking down. Otherwise, setting the orientation for that token during map building won\'t work properly.</p>\r\n<p>Here are a few resources with free tokens to get you started:</p>\r\n<ul>\r\n<li><a href=\"https://janloos.com/collections/top-down-tokens\" target=\"_blank\">Tokens by Jan Loos</a></li>\r\n<li><a href=\"https://www.forgotten-adventures.net/product-category/tokens/\" target=\"_blank\">Forgotten Adventures tokens</a></li>\r\n<li><a href=\"https://immortalnights.com/product-category/free-token-pack/\" target=\"_blank\">Tokens by Devin Night</a></li>\r\n<li><a href=\"https://www.pinterest.com/Sylphreni/top-down-tokens/\" target=\"_blank\">Tokens at Pinterest</a></li>\r\n</ul>\r\n\r\n<h3>Resource administration</h3>\r\n<p>Each adventure and map uses multiple resources, which can be stored within Cauldron. The following directories are available by default:</p>\r\n<ul>\r\n<li><b>audio</b>: Here you can store audio files that can be played during a game session. Audio files can be played on command or via a zone script.</li>\r\n<li><b>brushes:</b>: Here you can store your own tileable textures that can be used to paint the map background.</li>\r\n<li><b>characters</b>: Cauldron uses this directory for player character tokens and character sheets. Only change its content if you know what you\'re doing.</li>\r\n<li><b>collectables</b>: Cauldron uses this directory for collectables. Only change its content if you know what you\'re doing.</li>\r\n<li><b>effects</b>: Here you can store your own icons that can be used for map effects. A Dungeon Master can create a map effect by right clicking the map and selecting Create effect.</li>\r\n<li><b>maps</b>: Here you can store map background images. You can create a subdirectory per adventure if you like.</li>\r\n<li><b>pictures</b>: Here you can upload pictures you want to show to your players during a session. To do so, select \'Pictures\' from the menu during a session.</li>\r\n<li><b>tokens</b>: Cauldron uses this directory for monster, NPC and object tokens. Only change its content if you know what you\'re doing.</li>\r\n</ul>\r\n<p>You can link to a resource via <i>/resources/&lt;filename&gt;.</i> You can use the breadcrumbs above the resource browser to find the path to your resource file. Be aware that there is a limit to the amount of resources you can store in Cauldron. But since Cauldron is web based, you can also use resources from other servers.</p>\r\n\r\n<h3>Adventure administration</h3>\r\n<p>Before you can build maps, you need to create an adventure first. The background image and introduction story are shown in the main menu screen. You can link to an external background image or upload one to, for example, the root of the resource directory in the Resource Administration.</p>\r\n\r\n<h3>Map administration</h3>\r\n<p>Creating maps is the most important part of the adventure building. In Cauldron, you can use images and videos as a map background. They can be stored in Cauldron via Resource Administration, but you can also use resources from other servers. A background audio is played repeatedly when that map is active during a game session. A player controls its character via the keyboard, but optionally it can drag it via the mouse. When a player drags its character via the mouse, doors, walls and windows that would otherwise block the character\'s path, will be ignored. The default Fog of War distance only applies to the dark / night types and the manually reveal type (initial visible area around characters). During a game session, the map notes are available to the Dungeon Master via the \'DM notes\' button at the top of the screen.</p>\r\n<p>Cauldron offers multiple types of Fog of War: cell, real and manually reveal. Cell is a cell based Fog of War, where a cell is completely clear or covered. Real is a more realistic looking Fog of War type, but requires more computing power than the cell type. Both cell and real type have a day / illuminated and a night / dark modus. In the day / illuminated mode, a player can see as far as possible, where in the night / dark modus, sight is limited to a defined distance. The last type is manually reveal, where the Dungeon Master erases the Fog of War at his own discretion in a paint-like way.</p>\r\n<div class=\"row\">\r\n<div class=\"col-xs-12 col-sm-4\"><img src=\"/files/manual/fow_cell.png\" /><p>Cell</p></div>\r\n<div class=\"col-xs-12 col-sm-4\"><img src=\"/files/manual/fow_real.png\" /><p>Real</p></div>\r\n<div class=\"col-xs-12 col-sm-4\"><img src=\"/files/manual/fow_reveal.png\" /><p>Manually reveal</p></div>\r\n</div>\r\n<p>In the map building screen, right click on the map to create blinders, doors, lights, walls, windows and zones. You can add tokens by dragging them from your token collection on the right side of the screen onto the map. Right click on a token to change its settings. When you duplicate a token, the new token will have the same hit points, armor class, rotation and presence. Lowering a token allows you to access another token underneath it.</p>\r\n<img src=\"/files/manual/blinders.png\" alt=\"Blinders and windows\" title=\"Blinders and windows\" class=\"manual\" />\r\n<p>Doors, walls and windows can be used to block a player\'s path and or vision. They are all placed at the edges of the grid cells (hold the CTRL button to place consecutive walls or windows). Sometimes, a wall on a map isn\'t on a cell\'s edge. This is where you use blinders. Blinders can be placed anywhere on the map (hold CTRL to create consecutive blinders and hold the ALT button to get off the edges), but they only block vision. Use a combination of blinders and windows to have a correct path and vision blocking on such maps. In the next example, the walls are orange, the windows are blue and the blinders are purple. Cauldron remembers the last construct you\'ve created. So, while you\'re not creating a construct and you click on the map while holding the CTRL key, you start creating a new construct of that last type. Pressing the Escape key cancels any construct you\'re currently creating.</p>\r\n<p>A door can be opened (green) and closed (brown) by the Dungeon Master. A secret (yellow) door can\'t be seen by players. A barred (block pattern) door is transparent.</p>\r\n<p>A zone is mainly a visual marker on the map, but you can use a non-transparent zone to cover an area for players. A zone is always at least a bit transparent for a Dungeon Master. A 100% transparent zone is also always a bit visible for the Dungeon Master. You can automate several simple tasks via a script, which can be attached to a zone. What a script can do, is explained via the help button in the script editing window.</p>\r\n<p>Here are a few resources with free maps to get you started:</p>\r\n<ul>\r\n<li><a href=\"https://lostatlas.co/\" target=\"_blank\">Lost Atlas</a>, a battle map search engine</li>\r\n<li><a href=\"https://gamemaster.pixelastic.com/maps/\" target=\"_blank\">Pixelastic</a>, another battle map search engine</li>\r\n<li><a href=\"https://www.reddit.com/r/battlemaps/\" target=\"_blank\">Reddit Battle Maps</a></li>\r\n<li><a href=\"https://www.startpage.com/sp/search?query=pinterest+D%26D+battlemap&cat=pics\" target=\"_blank\">Search via Startpage</a></li>\r\n<li><a href=\"https://www.patreon.com/DantheMapMan\">Dan the Map Man</a></li>\r\n<li><a href=\"https://www.forgotten-adventures.net/battlemaps/\" target=\"_blank\">Forgotten Adventures</a></li>\r\n<li><a href=\"https://www.tomcartos.com/map-gallery\" target=\"_blank\">Tom Cartos</a>, <a href=\"https://www.patreon.com/posts/54516413\" target=\"_blank\">Master Post - Free</a></li>\r\n<!-- <li><a href=\"https://morvoldart.com/\" target=\"_blank\">Morvold Press</a></li> -->\r\n<li><a href=\"https://dicegrimorium.com/free-rpg-map-library/\" target=\"_blank\">Dice Grimorium</a></li>\r\n<li><a href=\"https://imgur.com/a/Hyy9l\" target=\"_blank\">Maps from Witcher 3</a></li>\r\n<li><a href=\"https://imgur.com/a/Ezc6b\" target=\"_blank\">More maps from Witcher 3</a></li>\r\n</ul>\r\n<p>Nice tools to create your own maps are <a href=\"https://dungeondraft.net/\">Dungeondraft</a> and <a href=\"https://pixelforest.itch.io/flowscape\">FlowScape</a>.</p>\r\n\r\n<h3>Collectable administration</h3>\r\n<p>Throughout the maps, you can hide items for players to find. Here you can create those items. Items can only be placed \'inside\' a token that is already placed on a map. In Map Administration, right click a token on a map and select \'Assign collectable\' to place a collectable inside that token.</p>\r\n<p>A player can find an item when its character is nearby the containing token and selects \'View\' via a right click on that token. An item that is found, is shown in every player\'s inventory. When an item is found, you can optionally let Cauldron automatically hide the containing token.</p>\r\n\r\n<h3>Player administration</h3>\r\n<p>The last step before you can start running your adventure, is to add player characters to your adventure. Before you can do so, make sure your players have created their character. Characters will be placed on the maps at or near the \'Player start\' marker. A player\'s character can only be active in one adventure at a time.</p>\r\n</div>\r\n\r\n<div class=\"section running\">\r\n<h2>Running an adventure</h2>\r\n<p>Right clicking with the mouse on a character, a token or the map opens a menu with options. Most options should explain themselves enough, but here is some information to make your understanding of Cauldron easier and faster.</p>\r\n<p><span class=\"fa fa-warning\"></span><b>Create effect:</b> An effect is a temporary visual marker on the map. When de Dungeon Master reloads the map, they are gone.</p>\r\n<p><span class=\"fa fa-lightbulb-o\"></span><b>Create light:</b> A light only has effect on a map with Fog of War type set to night / dark.</p>\r\n<p><span class=\"fa fa-hand-stop-o\"></span><b>Hand over:</b> Give control over this object to the player of the character which as your focus (double-click a character token). That player is now able to move and rotate that object.</p>\r\n<p><span class=\"fa fa-hand-grab-o\"></span><b>Take back:</b> Take back the control over this object from all other players.</p>\r\n<p><span class=\"fa fa-shield\"></span><b>Attack:</b> This rolls a D20 dice. The attack bonus you enter is added to the result of the dice roll. Only the outcome of the roll is shared with the players.</p>\r\n<p><span class=\"fa fa-compass\"></span><b>Send to map:</b> Makes the character invisible and sends it to another map. That map will also open in the Dungeon Master\'s browser.</p>\r\n<p>You can focus on a token or a player character by double clicking it. This allows you to control it via the keyboard. Double-clicking a token or player character while holding the CTRL button toggles its presence. Double-clicking a light toggles it on and off.</p>\r\n<h3>Combat</h3>\r\n<p>A battle is started by clicking the Combat button in the menu window or by entering /combat in the command line field. It rolls initiative for all players using their initiative bonus. You can add monsters or monster groups by entering their name and optionally their initiative bonus.</p>\r\n<img src=\"/files/manual/combat_buttons.png\" style=\"float:right\" />\r\n<p>When the combat has started, additional buttons appear above the command line field. The following buttons are available:</p>\r\n<ul style=\"list-style:none\">\r\n<li><b>&gt;</b>: Makes it the next character\'s or monster\'s turn.</li>\r\n<li><b>+</b>: An input field will appear. Enter the name of a monster that has to be added to the combat. It will be that monster\'s turn.</li>\r\n<li><b>-</b>: A clickable Combat Tracker list will appear. Click the name of the character or monster that has to be removed from the combat.</li>\r\n<li><b>&times;</b>: Stops the combat.</li>\r\n</ul>\r\n<p>You can also add monsters via the /add command and remove them via the /remove command. Change the player\'s turn via the /next command and, optionally, provide a name (or the first part of its name as long as it\'s unique) to change the battle order. Use the /done command to stop the battle.</p>\r\n<h3>Drawing on the map</h3>\r\n<p>As a Dungeon Master, you can make drawings on the screen. Hold the CTRL key to draw and the SHIFT key to erase. Open de menu in the upper right corner for all available drawing colors. Press the CTRL key while erasing to erase a larger area. Pressing the ALT key aligns the drawing or erasing to the grid.</p>\r\n<p>The Fog of War \'manually reveal\' mode is in fact nothing but a map covered with black paint, which is made half transparent for the Dungeon Master. Reveal the map like you would remove map paint, using SHIFT for small parts or CTRL+SHIFT for larger parts.</p>\r\n</div>\r\n\r\n<div class=\"section rule_system\">\r\n<h2>Rule system support</h2>\r\n<p>Cauldron VTT has support for multiple rule systems. As this support is new, only a few rule systems are supported for now. More rule systems will be added in the future. None of the supported rule systems are an official implementation of that rule system and Cauldron VTT has no partnership with the owner or the creator of that rule system. It\'s not Cauldron VTT\'s goal to do a full implementation of any rule system. Supporting a rule system only means that Cauldron VTT has a few features to make using that rule system within Cauldron VTT a bit more easy. That basically means that certain combat actions, that would otherwise require repetitive tasks, are automated.</p>\r\n<p>Cauldron VTT has some combat support for the following rule systems:</p>\r\n<ul>\r\n<li><b>Basic</b>: Keeps track of the health and has a combat tracker. You use the generic dice role option to do the rest manually.</li>\r\n<li><b>Daggerheart</b>: Keeps track of health and stress. Supports the Duality Dice, which includes keeping track of hope and fear.</li>\r\n<li><b>Dungeons & Dragons 5e</b>: Keeps track of health and armor class. Has a combat tracker and spells list.</li>\r\n<li><b>Pathfinder 2</b>: Keeps track of health and armor class and has a combat tracker.</li>\r\n</ul>\r\n</div>\r\n\r\n<script type=\"text/javascript\">\r\nshow_section(\'default\')\r\n</script>',1,0,0,NULL,NULL,NULL),
(2,'/','en',NULL,0,'img.cauldron {\r\n	position:absolute;\r\n	top:-150px;\r\n	right:100px;\r\n	width:200px;\r\n	filter:drop-shadow(0 10px 10px #ffffff);\r\n}\r\n\r\n@media (max-width:767px) {\r\n	img.cauldron {\r\n		width:150px;\r\n		top:-120px;\r\n		right:75px;\r\n	}\r\n}\r\n\r\ndiv.content div.row:first-of-type {\r\n	margin-bottom:25px;\r\n}\r\n\r\np.news {\r\n	text-align:center;\r\n	font-weight:bold;\r\n}\r\n\r\ndiv.content div.row:last-of-type {\r\n	margin-top:75px;\r\n}\r\n\r\na.btn {\r\n	width:100%;\r\n	  padding:15px;\r\n}\r\n\r\nimg.icon {\r\n	width:50px;\r\n	float:right;\r\n	margin-left:5px;\r\n}','Welcome to Cauldron','','','<img src=\"/images/cauldron.png\" class=\"cauldron\" />\r\n\r\n<p>Cauldron VTT is a tool to play role playing games online. Being a virtual tabletop, it\'s a digital version of a real table on which you would normally play such games.</p>\r\n\r\n<div class=\"row\">\r\n<div class=\"col-sm-4\"><img src=\"/files/dice.png\" class=\"icon\" ><h2>Any rule system</h2>There are many role playing games and many of them use dice for combat. With Cauldron’s generic dice system, you can play any such rule system. To make game play easier and faster, some basic combat support has been implemented for several popular rule systems.</div>\r\n<div class=\"col-sm-4\"><img src=\"/files/duck.png\" class=\"icon\" ><h2>Easy to use</h2>Cauldron\'s lightweight interface allows you to quickly and easily create adventures and battle maps and is easy for users to learn. Cauldron has an intuïtive interface, but also has an online manual which holds everything you need to know about Cauldron to get you started.</div>\r\n<div class=\"col-sm-4\"><img src=\"/files/coins.png\" class=\"icon\" ><h2>Free</h2>Cauldron is and will always be free to use. For its  creator, it\'s just a hobby project and a gift back to all those who also create and freely share role playing content. It’s even made <a href=\"https://gitlab.com/hsleisink/cauldron\" target=\"_blank\">open source</a>, so you can change and extend it in any way you want.</div>\r\n</div>\r\n\r\n<p class=\"news\">Cauldron VTT has the Lost Mine of Phandelver and the Curse of Strahd available in its adventure market!</p>\r\n\r\n<div class=\"row\">\r\n<div class=\"col-sm-6\"><a href=\"/register\" class=\"btn btn-primary\">Register for a free account</a></div>\r\n<div class=\"col-sm-6\"><a href=\"/adventure\" class=\"btn btn-primary\">Login to Cauldron VTT</a></div>\r\n</div>',1,0,0,NULL,NULL,NULL),
(3,'/screenshots','en',NULL,0,'div.content img {\r\n	width:100%;\r\n	border:1px solid #808080;\r\n	box-shadow:5px 5px 10px #404040;\r\n}\r\n\r\ndiv.content div.row {\r\n	margin-bottom:25px;\r\n}\r\n\r\n@media (min-width:768px) {\r\n	div.content img {\r\n		margin-bottom:25px;\r\n	}\r\n}\r\n\r\n@media (max-width:991px) {\r\n	div.row div {\r\n		margin-top:15px;\r\n	}\r\n}','Screenshots','Screenshots','screenshots','<div class=\"row\">\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/main_menu.png\" /></div>\r\n<div class=\"col-sm-4\">As a Dungeon Master, you can create multiple campaigns. They are easy accessible for your players. Users create their own character with a few clicks. Besides a character token image, only the name and a few parameters required for battle calculations are needed.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/forest.png\" /></div>\r\n<div class=\"col-sm-4\">Cauldron has a clear interface. Since it\'s fully web based, all you need is a browser. A right mouse click on a token gives a menu with multiple options to interact with it.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/combat.png\" /></div>\r\n<div class=\"col-sm-4\">An easy-to-use combat system that uses the Dungeons & Dragons 5th edition rules allows the players and Dungeon Master to fully focus on the game itself. You can easily add enemies to the combat list, roll for initiative and show who has the first turn. You can tell who\'s next, add new opponents or remove opponents or players from the combat via a single click or command. Right-clicking a token shows a menu, which holds options for damage, healing and all that is needed for the combat.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/tavern.png\" /></div>\r\n<div class=\"col-sm-4\">A sidebar shows messages and a command bar at the bottom allows users to enter several commands to control objects, the battle or the game. It can also be used to send messages to all players or to send a secret message to a single player. Cauldron contains a journal which players can use to write down notes, which are shared between all players.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/effects.png\" /></div>\r\n<div class=\"col-sm-4\">Besides all the tokens, Cauldron also allows to create visual effects on the map on the fly, like fire, poison gas, smoke or magic portals.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/search_items.png\" /></div>\r\n<div class=\"col-sm-4\">While creating a map, the Dungeon Master can hide objects within tokens, ready for the players to be found. The Inventory window keeps track of all the items that have been found.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/token_library.png\" /></div>\r\n<div class=\"col-sm-4\">You can create your own token library in Cauldron. This allows you to easily and quickly fill your maps with monsters and objects, by simply dragging them from your library onto your map.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/constructs.png\" /></div>\r\n<div class=\"col-sm-4\">A map can contain walls, doors and windows. You can use this to limit where players can walk or what they can see.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/fog_of_war.png\" /></div>\r\n<div class=\"col-sm-4\"><p>Cauldron has an easy to use fog of war system. It has three modus. A day mode, in which players can see until a wall or closed door blocks sight. A night mode, in which the player\'s sight is also limited to how far that character can see (night vision). In this mode, you can use lights to illuminate areas on the map. The last mode is the manually reveal mode, in which the Dungeon Master removes the fog of war in a paint-like way.</p></div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/zone_scripts.png\" /></div>\r\n<div class=\"col-sm-4\">You can place zones on a map, which can be used to mark an area, for example for a spell effect. The Dungeon Master can attach a script to a zone to make his/her life easier. A typical use for such script is when you have a battle map that contains two or more floors of a building and a character needs to be moved when it walks up or down a stairway.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/drawing.png\" /></div>\r\n<div class=\"col-sm-4\">Creating your own map or finding the right one on the internet can take quite some time. To overcome that problem, Cauldron VTT allows you to draw on the map. Use the empty grid map that comes with Cauldron and start drawing. Just like using felt pens on a real grid map on a table, you can create your map within a few minutes. It all depends of course on how much detail you want to put into your map, but this is an example of what can be done. You can add your own textures and effects to give the map more style.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/adventure_market.png\" /></div>\r\n<div class=\"col-sm-4\">In the Adventure Market, you can find several ready-to-use adventures. It has the famous introductory adventure Lost Mine of Phandelver, the Curse of Strahd adventure and many short adventures that can be found on the internet. The maps contain all the walls, windows and doors required for Cauldron VTT\'s fog of war feature.</div>\r\n\r\n<div class=\"col-sm-8\"><img src=\"/files/screenshots/cauldey.png\" /></div>\r\n<div class=\"col-sm-4\">Learning a VTT can sometimes be challenging. To help you with that, Cauldron VTT has Cauldey. Although it\'s just a CR 0 tiny beast, Cauldey knows a lot about Cauldron VTT. By pointing to the right buttons, he guides you through all the steps that are needed to create your first adventure. He also helps you to learn about all the other options that are available for you as a dungeon master. </div>\r\n\r\n</div>',1,0,0,NULL,NULL,NULL),
(4,'/about','en',NULL,0,'img.logo {\r\n	float:right;\r\n	margin-left:15px;\r\n	max-width:40%;\r\n}','About Cauldron VTT','About Cauldron VTT','','<img src=\"/images/cauldron.png\" class=\"logo\" />\r\n\r\n<p>Cauldron VTT (virtual tabletop) is a free and open source virtual tabletop tool to play role playing adventures online. Of course there is more to tell about Cauldron than just that. So, this page gives you a bit more insight in what it is and what it has to offer.</p>\r\n\r\n<h2>The development of Cauldron</h2>\r\n<p>Why did I create Cauldron? The pandemic forced my friends and me to play our Dungeons & Dragons sessions online for a while. We used Roll20 for that, but in my experience Roll20 is a bit slow, specially to get it started, and its interface is a bit clumsy here and there. As I was already looking for a new hobby project due to the staying-home, I saw a nice challenge in building my own virtual tabletop. The result is what you see in front of you.</p>\r\n<p>You can use Cauldron VTT freely. Since I\'m a big fan and supporter of open source software, I also made Cauldron VTT open source. It\'s available at my <a href=\"https://gitlab.com/hsleisink/cauldron\" target=\"_blank\">Gitlab</a> page.</p>\r\n\r\n<h2>Lightweight</h2>\r\n<p>One of the main reasons I created Cauldron VTT is because I wanted a lightweight VTT. There are a lot of great VTTs out there with many cool features and fantastic 3D graphics. The downside of that all is that they take a lot of time to set up and to prepare your adventure. What I wanted is a VTT that just offers the digital version of a real tabletop. Nothing more. Specially in the pandemic time, I wanted to be able to switch between a session at a real table and an online session quickly. My VTT must therefore also allow my players to switch quickly. So, no character sheet replacement and no spell and magic item lists. Just use what you are used to.</p>\r\n<p>Another reason I want my VTT to be simple, is because I want my role playing sessions to stay what they are: fantasy games. I admit that those modern VTTs with 3D graphics look amazing, but to me they turn the game too much into a 3D computer game. Role playing should be about the story the DM and the players create together, in their imagination. The attention should fully go to the story, not to the 3D eye candy on the screen.</p>\r\n<p>The only thing I implemented in Cauldron VTT which you don\'t have on a real table is Fog of War. Simply because it was fun to make and cool to have. ;)</p>\r\n\r\n<h2>Rule systems</h2>\r\n<p>There are a lot of role playing game systems. I think Dungeons & Dragons is one of the more well known systems. It\'s the system that I play, so that\'s of course the system I implemented in Cauldron. However, during development of Cauldron, me and my group also started playing Cyberpunk Red and Dune. I have no intention to implement a lot of other rule systems, but I\'m trying to keep Cauldron useful for other rule systems. Therefore, I kept the support for Dungeons & Dragons 5E to a bare minimum. You can simply do manual in-game dice rolling for other rule systems. After all, that\'s what every rule system needs. The roll of a dice.</p>\r\n<p>I hope you like what I\'ve made. You can take a look at the <a href=\"/screenshots\">screenshots</a> to get an impression of what Cauldron has to offer. If you want to try it yourself, use one of the available <a href=\"/adventure\">demo accounts</a> and take control of one of the characters in the demo game. When you log in, an online manual is available to get you started. Have fun!</p>\r\n\r\n<p>Hugo Leisink</p>',1,0,0,NULL,NULL,NULL),
(5,'/contact','en',NULL,0,'form textarea.form-control {\r\n  max-width:800px;\r\n  height:200px;\r\n}','Contact','Contact form','contact','<p>In case of an error, try reloading the page via Ctrl+F5 first. It might solve the issue. A persistent browser cache can prevent new scripts from being loaded.</p>\r\n<p>You can ask for support at the <a href=\"https://discord.gg/w8FB93taYJ\">Cauldron VTT Discord server</a> or use this form to send a question or comment directly to the Cauldron VTT webmaster.</p>\r\n\r\n{{required email E-mail address}}\r\n{{required text Question or comment}}',1,0,1,'Send','hugo@leisink.net','<p>Thanks for your message. I\'ll contact you as soon as possible.</p>\r\n\r\n<p>the Cauldron VTT webmaster</p>'),
(6,'/privacy','en',NULL,0,'img.logo {\r\n	float:right;\r\n	margin-left:25px;\r\n	max-width:40%;\r\n	width:200px;\r\n}','Privacy statement','Privacy statement','privacy statement','<img src=\"/images/cauldron.png\" class=\"logo\" />\r\n<p>Cauldon VTT\'s goal is to provide you with a tool to play Dungeon\'s & Dragons or any other role playing game online. Nothing more, nothing less. User information is never shared with anyone, no matter what. Cauldron VTT asks for your name (which you may fake), so you can be introduced properly when you join a session. The e-mail address is requested, so you can do a password-reset in case you\'ve forgotten your password. The e-mail address will also be used to send e-mails with information about maintenance work or new features.</p>\r\n\r\n<p>The website and web server collect IP addresses in log files for the sole purpose of enabling me to take action in the event of errors or problems with the website or in case of hacking attempts. This website runs on a private server, so old log data is only deleted at random times. In practice this is a few times a year. The basis for this processing is the \'legitimate interest\' as referred to in <a href=\"https://www.privacy-regulation.eu/en/article-6-lawfulness-of-processing-GDPR.htm\">GDPR Article 6 (1) f</a>, as indicated in <a href=\"https://www.privacy-regulation.eu/en/r49.htm\">GDPR recital 49</a>.</p>\r\n\r\n<p>Hugo Leisink<br />\r\nCauldron VTT\'s creator and maintainer</p>',1,0,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relation_connections`
--

DROP TABLE IF EXISTS `relation_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `relation_connections` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `from_entity_id` int(10) unsigned NOT NULL,
  `to_entity_id` int(11) unsigned NOT NULL,
  `color` text NOT NULL,
  `type` tinyint(3) unsigned NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `from_object_id` (`from_entity_id`),
  KEY `to_object_id` (`to_entity_id`),
  CONSTRAINT `relation_connections_ibfk_2` FOREIGN KEY (`from_entity_id`) REFERENCES `relation_entities` (`id`),
  CONSTRAINT `relation_connections_ibfk_3` FOREIGN KEY (`to_entity_id`) REFERENCES `relation_entities` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `relation_entities`
--

DROP TABLE IF EXISTS `relation_entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `relation_entities` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `title` varchar(25) NOT NULL,
  `color` varchar(7) NOT NULL,
  `description` text NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `relation_entities_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reroute`
--

DROP TABLE IF EXISTS `reroute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reroute` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `original` varchar(100) NOT NULL,
  `replacement` varchar(100) NOT NULL,
  `type` tinyint(3) unsigned NOT NULL,
  `description` tinytext NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reroute`
--
-- ORDER BY:  `id`

LOCK TABLES `reroute` WRITE;
/*!40000 ALTER TABLE `reroute` DISABLE KEYS */;
INSERT INTO `reroute` VALUES
(1,'/cms','/vault',1,'');
/*!40000 ALTER TABLE `reroute` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `non_admins` smallint(1) NOT NULL,
  `vault` tinyint(1) NOT NULL,
  `vault/access` tinyint(1) NOT NULL,
  `vault/action` tinyint(1) NOT NULL,
  `vault/adventure` tinyint(1) NOT NULL,
  `vault/agenda` tinyint(1) NOT NULL,
  `vault/collectable` tinyint(1) NOT NULL,
  `vault/condition` tinyint(1) NOT NULL,
  `vault/dice` tinyint(1) NOT NULL,
  `vault/file` tinyint(1) NOT NULL,
  `vault/invite` tinyint(1) NOT NULL,
  `vault/journal` tinyint(1) NOT NULL,
  `vault/map` tinyint(1) NOT NULL,
  `vault/map/arrange` tinyint(1) NOT NULL,
  `vault/menu` tinyint(1) NOT NULL,
  `vault/newsletter` tinyint(1) NOT NULL,
  `vault/organisation` tinyint(1) NOT NULL,
  `vault/page` tinyint(1) NOT NULL,
  `vault/players` tinyint(1) NOT NULL,
  `vault/questionnaire` tinyint(1) NOT NULL,
  `vault/role` tinyint(1) NOT NULL,
  `vault/reroute` tinyint(1) NOT NULL,
  `vault/resources` tinyint(1) NOT NULL,
  `vault/settings` tinyint(1) NOT NULL,
  `vault/story` tinyint(1) NOT NULL,
  `vault/switch` tinyint(1) NOT NULL,
  `vault/token` tinyint(1) NOT NULL,
  `vault/user` tinyint(1) NOT NULL,
  `account` tinyint(1) NOT NULL,
  `adventure` tinyint(1) NOT NULL,
  `agenda` tinyint(1) NOT NULL,
  `cauldey` tinyint(1) NOT NULL,
  `character` tinyint(1) NOT NULL,
  `object` tinyint(1) NOT NULL,
  `questionnaire` tinyint(1) NOT NULL,
  `relations` tinyint(1) NOT NULL,
  `session` tinyint(1) NOT NULL,
  `spectate` tinyint(1) NOT NULL,
  `rs` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--
-- ORDER BY:  `id`

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES
(1,'Administrator',0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1),
(2,'Player',1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,1,1,1,0),
(3,'Dungeon Master',1,1,0,0,1,1,1,0,1,0,0,1,1,1,0,0,0,0,1,0,0,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1),
(4,'User maintainer',1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,1,1,1,1,1,0);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rule_systems`
--

DROP TABLE IF EXISTS `rule_systems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rule_systems` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `code` varchar(15) NOT NULL,
  `visible` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rule_systems`
--
-- ORDER BY:  `id`

LOCK TABLES `rule_systems` WRITE;
/*!40000 ALTER TABLE `rule_systems` DISABLE KEYS */;
INSERT INTO `rule_systems` VALUES
(1,'Basic','basic',1),
(2,'Dungeons & Dragons 5e','dnd5',1),
(3,'Pathfinder 2e','pathfinder2',1),
(4,'Daggerheart','daggerheart',1),
(5,'Cyberpunk Red','cyberpunkred',1);
/*!40000 ALTER TABLE `rule_systems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `session_id` varchar(128) NOT NULL,
  `login_id` varchar(128) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `expire` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(10) unsigned DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `bind_to_ip` tinyint(1) NOT NULL,
  `name` tinytext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(32) NOT NULL,
  `type` varchar(8) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--
-- ORDER BY:  `id`

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES
(1,'admin_page_size','integer','25'),
(2,'database_version','float','4.0'),
(3,'default_language','string','en'),
(4,'head_description','string','A free and open source virtual tabletop to play role playing games online.'),
(5,'head_keywords','string','Cauldron, virtual tabletop, VTT, free, rpg, role playing, D&D, Pathfinder, open source'),
(6,'head_title','string','Cauldron VTT'),
(7,'hiawatha_cache_default_time','integer','3600'),
(8,'hiawatha_cache_enabled','boolean','false'),
(9,'page_after_login','string','adventure'),
(10,'secret_website_code','string',''),
(11,'session_persistent','boolean','true'),
(12,'session_timeout','string','1 week'),
(13,'start_page','string',''),
(14,'screen_grid_size','integer','50'),
(15,'webmaster_email','string','root@localhost'),
(16,'default_max_resources','integer','100'),
(17,'newsletter_bcc_size','integer','50'),
(18,'newsletter_email','string','root@localhost'),
(19,'newsletter_name','string','Cauldron VTT');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `story_encounter_monsters`
--

DROP TABLE IF EXISTS `story_encounter_monsters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `story_encounter_monsters` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `story_encounter_id` int(10) unsigned NOT NULL,
  `monster` varchar(50) NOT NULL,
  `cr` varchar(3) NOT NULL,
  `count` tinyint(3) unsigned NOT NULL,
  `source` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `story_encounter_id` (`story_encounter_id`),
  CONSTRAINT `story_encounter_monsters_ibfk_1` FOREIGN KEY (`story_encounter_id`) REFERENCES `story_encounters` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `story_encounters`
--

DROP TABLE IF EXISTS `story_encounters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `story_encounters` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `title` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `story_encounters_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `story_events`
--

DROP TABLE IF EXISTS `story_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `story_events` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `nr` int(10) unsigned NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `story_events_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `story_npcs`
--

DROP TABLE IF EXISTS `story_npcs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `story_npcs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `name` varchar(50) NOT NULL,
  `cr` varchar(3) NOT NULL,
  `type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `story_npcs_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `story_objects`
--

DROP TABLE IF EXISTS `story_objects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `story_objects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `adventure_id` int(10) unsigned NOT NULL,
  `nr` int(10) unsigned NOT NULL,
  `name` varchar(50) NOT NULL,
  `located` varchar(50) NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `adventure_id` (`adventure_id`),
  CONSTRAINT `story_objects_ibfk_1` FOREIGN KEY (`adventure_id`) REFERENCES `adventures` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tokens`
--

DROP TABLE IF EXISTS `tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `organisation_id` int(10) unsigned NOT NULL,
  `name` varchar(50) NOT NULL,
  `width` tinyint(3) unsigned NOT NULL,
  `height` tinyint(3) unsigned NOT NULL,
  `extension` varchar(4) NOT NULL,
  `type` enum('topdown','portrait') NOT NULL,
  `armor_class` tinyint(3) unsigned NOT NULL,
  `hitpoints` smallint(5) unsigned NOT NULL,
  `shape_change` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_role`
--

DROP TABLE IF EXISTS `user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_role` (
  `user_id` int(10) unsigned NOT NULL,
  `role_id` int(10) unsigned NOT NULL,
  KEY `role_id` (`role_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_role_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_role_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_role`
--

LOCK TABLES `user_role` WRITE;
/*!40000 ALTER TABLE `user_role` DISABLE KEYS */;
INSERT INTO `user_role` VALUES
(1,1);
/*!40000 ALTER TABLE `user_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `organisation_id` int(10) unsigned NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` tinytext NOT NULL,
  `one_time_key` varchar(128) DEFAULT NULL,
  `cert_serial` int(10) unsigned DEFAULT NULL,
  `status` tinyint(4) unsigned NOT NULL DEFAULT 0,
  `authenticator_secret` varchar(16) DEFAULT NULL,
  `fullname` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `keyboard` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `organisation_id` (`organisation_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--
-- ORDER BY:  `id`

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,1,'admin','none',NULL,NULL,1,NULL,'Administrator','root@localhost',0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `walls`
--

DROP TABLE IF EXISTS `walls`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `walls` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `length` smallint(5) unsigned NOT NULL,
  `direction` enum('horizontal','vertical') NOT NULL,
  `transparent` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `walls_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `zones`
--

DROP TABLE IF EXISTS `zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `zones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `map_id` int(10) unsigned NOT NULL,
  `pos_x` smallint(5) unsigned NOT NULL,
  `pos_y` smallint(5) unsigned NOT NULL,
  `width` tinyint(3) unsigned NOT NULL,
  `height` tinyint(3) unsigned NOT NULL,
  `color` varchar(7) NOT NULL,
  `opacity` decimal(3,1) NOT NULL,
  `script` text NOT NULL,
  `group` varchar(10) NOT NULL,
  `altitude` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `map_id` (`map_id`) USING BTREE,
  CONSTRAINT `zones_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-04 12:35:14
