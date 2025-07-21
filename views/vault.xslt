<?xml version="1.0" ?>
<!--
//
//  Copyright (c) by Hugo Leisink <hugo@leisink.net>
//  This file is part of the Banshee PHP framework
//  https://www.banshee-php.org/
//
//  Licensed under The MIT License
//
//-->
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />

<xsl:template match="content">
<img src="/images/cauldron.png" class="title_icon" />
<h1>Dungeon Master's Vault</h1>
<xsl:for-each select="menu/section">
	<div class="panel panel-default">
		<div class="panel-heading"><xsl:value-of select="@title" /></div>
		<ul class="panel-body">
		<xsl:for-each select="entry">
			<li><a href="/{.}"><img src="/images/icons/{@icon}" class="icon" /><xsl:value-of select="@text" /></a></li>
		</xsl:for-each>
		</ul>
	</div>
</xsl:for-each>

<div id="help">
<p>The Dungeon Master's Vault is where you as a Dungeon Master maintain your adventures and the accounts of your players.</p>
<p>If you want to create a new adventure, start by clicking the Adventures icon.</p>
<p>You can ask <a href="/cauldey">Cauldey</a> to help you create your first adventure.</p>
</div>
</xsl:template>

</xsl:stylesheet>
