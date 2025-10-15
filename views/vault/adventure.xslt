<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />
<xsl:import href="../banshee/pagination.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<table class="table table-condensed table-striped table-hover">
<thead>
<tr><th>ID</th><th>Title</th><th>Rule system</th><th>Maps</th><th>Players</th><th>Access</th></tr>
</thead>
<tbody>
<xsl:for-each select="adventures/adventure">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="@id" /></td>
<td><xsl:value-of select="title" /></td>
<td><xsl:value-of select="rule_system" /></td>
<td><xsl:value-of select="maps" /></td>
<td><xsl:value-of select="players" /></td>
<td><xsl:value-of select="access" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New adventure</a>
<a href="/vault" class="btn btn-default">Back</a>
</div>
<xsl:if test="@market='yes'">
<div class="btn-group right">
<a href="/vault/adventure/market" class="btn btn-primary">Browse adventure market</a>
</div>
</xsl:if>

<div id="help">
<p>All your adventures are listed here. When creating an adventure, you need to specify a rule system. That defines what options are available during the game. None of the available rule systems are fully implemented. Cauldron VTT only contains a few combat options to make the game play for that rule system a bit easier.</p>
<p>After creating a new adventure, you will automatically be forwarded to the Maps section, where you can add one or more maps to your adventure. To manually go to the Maps section, click the Back button and then the Maps icon.</p>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post">
<xsl:if test="adventure/@id">
<input type="hidden" name="id" value="{adventure/@id}" />
</xsl:if>

<div class="form-group">
<label for="title">Title:</label>
<input type="text" id="title" name="title" value="{adventure/title}" maxlength="50" placeholder="The title of this adventure / campaign." class="form-control" />
</div>
<div class="form-group">
<label for="rule_systemn_id">Rule system:</label>
<xsl:if test="adventure/@id">
<input type="hidden" name="rule_system_id" value="{adventure/rule_system_id}" />
</xsl:if>
<select id="rule_system_id" class="form-control">
<xsl:if test="not(adventure/@id)">
<xsl:attribute name="name">rule_system_id</xsl:attribute>
</xsl:if>
<xsl:if test="adventure/@id">
<xsl:attribute name="disabled">disabled</xsl:attribute>
</xsl:if>
<xsl:for-each select="rule_systems/rule_system">
<option value="{@id}"><xsl:if test="@id=../../adventure/rule_system_id"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
</div>
<div class="form-group">
<label for="image">Title background image URL (optional):</label>
<div class="input-group">
<input type="text" id="image" name="image" value="{adventure/image}" placeholder="The image to show in the Adventures page." class="form-control" />
<span class="input-group-btn"><input type="button" value="Browse resources" class="btn btn-default browser" /></span>
</div>
</div>
<div class="form-group">
<label for="introduction">Introduction story (optional):</label>
<textarea id="introduction" name="introduction" class="form-control" placeholder="A story to introduce this adventure to your players."><xsl:value-of select="adventure/introduction" /></textarea>
</div>
<div class="form-group">
<label for="access">Access rights:</label>
<select id="access" name="access" class="form-control">
<xsl:for-each select="access/level">
<option value="{@value}"><xsl:if test="@value=../../adventure/access"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option>
</xsl:for-each>
</select>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save adventure" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="adventure/@id">
<input type="submit" name="submit_button" value="Delete adventure" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
<xsl:if test="/output/user/@admin='yes'">
<input type="submit" name="submit_button" value="Export adventure" class="btn btn-default" />
</xsl:if>
</xsl:if>
</div>
</form>

<div id="help">
<p><b>Title background image:</b> When no background image is specified, a <a href="/files/default.jpg" target="_blank">default image</a> will be used. You can store your custom images in, for example, the root of your <a href="/vault/resources">Resources section</a> and then use '/resources/&lt;file name&gt;' as the URL. You can also link to external images by using the full URL of that image.</p>
<p><b>Access rights:</b> With this setting, you control who has access to this adventure.</p>
</div>
</xsl:template>

<!--
//
//  Market template
//
//-->
<xsl:template match="market">
<div class="filter">Showing <span id="count"></span> adventures. Filter by level:
<select class="form-control filter" onChange="javacript:filter_level()">
<option value="">none</option>
<xsl:for-each select="adventure/level[not(.=preceding::*)]">
<option value="{.}"><xsl:value-of select="." /></option>
</xsl:for-each>
</select></div>

<xsl:call-template name="show_messages" />
<div class="row market adventures">
<xsl:for-each select="adventure">
<div class="col-md-6 col-sm-12 adventure" level="{level}">
<div class="panel panel-primary">
<div class="panel-heading"><xsl:value-of select="title" /></div>
<div class="panel-body"><xsl:for-each select="summary/item"><p><xsl:value-of select="." /></p></xsl:for-each></div>
<div class="panel-footer">
<xsl:if test="level">
<span>Party level: <xsl:value-of select="level" /></span>
</xsl:if>
<xsl:if test="guide">
<span><a href="{guide}" target="_blank">Adventure guide</a></span>
</xsl:if>
<xsl:for-each select="source/item">
<span class="source"><a href="{.}" target="_blank">Source</a></span>
</xsl:for-each>
<form action="/vault/adventure" method="post">
<input type="hidden" name="adventure" value="{adventure}" />
<input type="submit" name="submit_button" value="Import adventure" class="btn btn-xs btn-primary" />
</form>
</div>
</div>
</div>
</xsl:for-each>
</div>

<div class="btn-group left">
<a href="/vault/adventure" class="btn btn-default">Back</a>
</div>

<div id="help">
<p>In the market, you browse through and import adventures that can be found for free on the internet. An adventure contains one or more maps and each map can contain constructs like walls, doors and windows. This allows you to quickly use Cauldron's fog of war and dynamic lighting features.</p>
<p>Due to copyright restrictions, the maps don't contain any tokens. It's up to you to place the right tokens from your own collection on the map according to the adventure guide.</p>
</div>
</xsl:template>

<!--
//
//  Token selector template
//
//-->
<xsl:template match="token_selector">
<p>This adventure contains token information. Because Cauldron VTT doesn't have a commercial market and most tokens are commercial, you have to import and use your own token collection. If you haven't imported your own tokens into Cauldron VTT, you are advised <a href="/vault/token">to do so first</a>. In this step, you have to select what token to use from your own collection for the token that was placed on the maps of this adventure by the one who designed it. Cauldron VTT already made a best guess based on the names.</p>

<form action="/vault/adventure" method="post">
<input type="hidden" name="adventure" value="{adventure}" />

<div class="row token_selector">
<div class="col-sm-6 col-xs-12">Tokens on this adventure's maps</div><div class="col-sm-6 col-xs-12">Your token collection</div>
<xsl:for-each select="placed/token">
<div class="col-sm-6 col-xs-12">
<span><xsl:value-of select="type" /> (<xsl:value-of select="width" />&#215;<xsl:value-of select="height" />, HP:<xsl:value-of select="hitpoints" />, AC:<xsl:value-of select="armor_class" />)</span>
</div>
<div class="col-sm-6 col-xs-12">
<select name="tokens[{type}]" class="form-control">
<xsl:variable name="match" select="match" />
<xsl:for-each select="../../library/token">
<option value="{@id}"><xsl:if test="@id=$match"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="name" /> (<xsl:value-of select="width" />&#215;<xsl:value-of select="height" />, HP:<xsl:value-of select="hitpoints" />, AC:<xsl:value-of select="armor_class" />)</option>
</xsl:for-each>
</select>
</div>
</xsl:for-each>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Import adventure" class="btn btn-default" />
<a href="/vault/adventure/market" class="btn btn-default">Cancel</a>
</div>
</form>
</xsl:template>


<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/adventure.png" class="title_icon" />
<h1><xsl:value-of select="/output/layout/title/@page" /></h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="market" />
<xsl:apply-templates select="token_selector" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
