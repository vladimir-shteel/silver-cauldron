<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="../banshee/main.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<div class="row filter">
<div class="col-sm-6 col-xs-12">
<div class="btn-group">
<a href="/{/output/page}/new" class="btn btn-default">New token</a>
<a href="/{/output/page}/archive" class="btn btn-default">Upload archive</a>
<a href="/vault" class="btn btn-default">Back</a>
</div>
</div>
<div class="col-sm-6 col-xs-12">
<div class="input-group">
<input id="filter" type="text" placeholder="Filter tokens" class="form-control" onKeyUp="javascript:filter_tokens()" />
<span class="input-group-btn"><button class="btn btn-default" type="button">X</button></span>
</div>
</div>
</div>

<div class="row">
<xsl:for-each select="tokens/token">
<div class="col-xs-12 col-sm-4 col-md-3 token">
<div class="well well-sm" onClick="javascript:document.location='/{/output/page}/{@id}'">
<img src="/resources/{/output/cauldron/resources_key}/tokens/{@id}.{extension}" title="{name}" class="icon {type}" />
<div class="name"><xsl:value-of select="name" /><xsl:if test="shape_change='yes'"><span class="shape_change">(sc)</span></xsl:if></div>
<div>Size: <xsl:value-of select="width" /> &#215; <xsl:value-of select="height" /></div>
<div>Hit points: <xsl:value-of select="hitpoints" /></div>
</div>
</div>
</xsl:for-each>
</div>

<div id="help">
<p>Here you maintain your tokens, which can represent an NPC, a monster or an object. These tokens are available for all your adventures.</p>
<p>To avoid having to recreate the same token for each rule system, all attributes are available when creating a token. Simply ignore the attributes you don't need.</p>
<p>A <span class="shape_change">(cs)</span> after the name of a token means that that token is available for shape change.</p>
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
<xsl:if test="token/@id">
<input type="hidden" name="id" value="{token/@id}" />
<input type="hidden" name="extension" value="{token/extension}" />
<img src="/resources/{/output/cauldron/resources_key}/tokens/{token/@id}.{token/extension}" class="token {token/type}" />
</xsl:if>

<div class="row">
<div class="col-sm-6">
<div class="form-group">
<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{token/name}" maxlength="50" placeholder="The name of this NPC/monster/object." class="form-control" />
</div>
<div class="form-group">
<label for="width">Width:</label>
<input type="text" id="width" name="width" value="{token/width}" class="form-control" />
</div>
<div class="form-group">
<label for="height">Height:</label>
<input type="text" id="height" name="height" value="{token/height}" class="form-control" />
</div>
<div class="form-group">
<label for="image">Image file:</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="image" style="display:none" class="form-control" onChange="$('#upload-file-info').val(this.files[0].name); token_selected();" />Browse</label></span>
<input type="text" id="upload-file-info" readonly="readonly" class="form-control" />
</div>
<div class="radio-group type">
<input type="hidden" name="type_backup" value="{token/type}" />
<span><input type="radio" name="type" value="portrait" disabled="disabled"><xsl:if test="token/type='portrait'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Portrait token image</span>
<span><input type="radio" name="type" value="topdown" disabled="disabled"><xsl:if test="token/type='topdown'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Top-down token image</span>
<span class="select">&lt;-- select the token type</span>
</div>
</div>
<div class="form-group">
<label for="armor_class">Default armor class:</label>
<input type="text" id="armor_class" name="armor_class" value="{token/armor_class}" class="form-control" />
</div>
<div class="form-group">
<label for="hitpoints">Default hit points:</label>
<input type="text" id="hitpoints" name="hitpoints" value="{token/hitpoints}" class="form-control" />
<div><b>Available for shape change:</b><input type="checkbox" name="shape_change"><xsl:if test="token/shape_change='yes'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input></div>
</div>
</div>
<div class="col-sm-6 monsters">
</div>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save token" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="token/@id">
<input type="submit" name="submit_button" value="Delete token" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>

<div id="help">
<p><b>Image:</b> Make sure select the right token type after you uploaded the token image. The character creation page of the <a href="/manual#character">online manual</a> explains the differences.</p>
<p><b>Default armor class:</b> The armor class as used in Dungeons &amp; and Dragons and Pathfinder. In Daggerheart, this value is used for the difficulty.</p>
<p><b>Availble for shape change:</b> When a token is available for shape change, you can change a player's token into this appearance. While running an adventer, right-click a player's token and select 'Change shape'.</p>
</div>
</xsl:template>

<!--
//
//  Archive template
//
//-->
<xsl:template match="archive">
<xsl:call-template name="show_messages" />
<form action="/{/output/page}" method="post" enctype="multipart/form-data">
<div class="form-group">
<label for="image">ZIP archive file:</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="archive" style="display:none" class="form-control" onChange="$('#upload-file-info').val(this.files[0].name); token_selected();" />Browse</label></span>
<input type="text" id="upload-file-info" readonly="readonly" class="form-control" />
</div>
</div>
<div class="form-group">
<div class="radio-group type">
<input type="hidden" name="type_backup" value="{archive/type}" />
<span><input type="radio" name="type" value="portrait"><xsl:if test="archive/type='portrait'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Portrait token images</span>
<span><input type="radio" name="type" value="topdown"><xsl:if test="archive/type='topdown'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Top-down token images</span>
</div>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Upload archive" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="token/@id">
</xsl:if>
</div>
</form>

<div id="help">
<p>Here you can upload an archive file containing token images. The token's filename will be the token's name. All the tokens in the archive have to be of the same type (portrait or top-down).</p>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<img src="/images/icons/token.png" class="title_icon" />
<h1>Token collection</h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="archive" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
