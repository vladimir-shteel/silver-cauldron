<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />
<xsl:import href="../includes/adventures_pulldown.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<xsl:apply-templates select="adventures_pulldown" />

<table class="table table-condensed table-striped table-hover">
<thead>
<tr><th>Name</th><th>Location</th><th>Found</th><th>Hide token</th><th>Explained</th></tr>
</thead>
<tbody>
<xsl:for-each select="collectables/collectable">
<tr class="click" onClick="javascript:document.location='/{/output/page}/{@id}'">
<td><xsl:value-of select="name" /></td>
<td><xsl:value-of select="location" /></td>
<td><xsl:value-of select="found" /></td>
<td><xsl:value-of select="hide" /></td>
<td><xsl:value-of select="explain" /></td>
</tr>
</xsl:for-each>
</tbody>
</table>

<div class="btn-group left">
<a href="/{/output/page}/new" class="btn btn-default">New collectable</a>
<a href="/vault" class="btn btn-default">Back</a>
</div>

<div id="help">
<p>A collectable is an object that can be hidden inside a token on a map for players to find. To hide a collectable inside a token, go to the <a href="/vault/map">Map section</a>, select a map, right-click a token and choose 'Assign collectable'.</p>
<p>When during a game session a player right-clicks a nearby token and selects 'View', that object will be revealed. The player can then choose to add that object to the inventory, which is shared among all players.</p>
</div>
</xsl:template>

<!--
//
//  Edit template
//
//-->
<xsl:template match="edit">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post" enctype="multipart/form-data">
<xsl:if test="collectable/@id">
<input type="hidden" name="id" value="{collectable/@id}" />
<img src="/resources/{/output/cauldron/resources_key}/collectables/{collectable/image}" class="collectable" />
</xsl:if>

<div class="form-group">
<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{collectable/name}" maxlength="50" placeholder="A reference for you as the Dungeon Master." class="form-control" />
</div>
<div class="form-group">
<label for="description">Description:</label>
<textarea id="description" name="description" placeholder="To be shown to the players." class="form-control"><xsl:value-of select="collectable/description" /></textarea>
</div>
<div class="form-group">
<label for="image">Image:</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="image" style="display:none" class="form-control" onChange="$('#upload-file-info').val(this.files[0].name)" />Browse</label></span>
<input type="text" id="upload-file-info" readonly="readonly" class="form-control" />
</div>
</div>
<xsl:if test="collectable/location!=''">
<div class="form-group">
<label>Location:</label>
<input readonly="readonly" value="{collectable/location}" class="form-control" />
</div>
</xsl:if>
<div class="option"><input type="checkbox" name="found"><xsl:if test="collectable/found='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Collectable has been found (visible in inventory).</div>
<div class="option"><input type="checkbox" name="hide"><xsl:if test="collectable/hide='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Hide the containing token when the collectable is found.</div>
<div class="option"><input type="checkbox" name="explain"><xsl:if test="collectable/explain='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>When found, explain the collectable by revealing the desciption to the players.</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save collectable" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="collectable/@id">
<input type="submit" name="submit_button" value="Delete collectable" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/collectables.png" class="title_icon" />
<h1>Collectables</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
