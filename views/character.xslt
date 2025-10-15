<?xml version="1.0" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />

<!--
//
//  Overview template
//
//-->
<xsl:template match="overview">
<div class="row">
<xsl:for-each select="characters/character">
<div class="col-md-4 col-sm-6 col-xs-12">
<div class="panel panel-default">
<div class="panel-heading">
<xsl:value-of select="name" />
<a href="/{/output/page}/weapon/{@id}" title="Weapons"><span class="fa fa-legal" aria-hidden="true"></span></a>
<a href="/{/output/page}/alternate/{@id}" title="Alternate tokens"><span class="glyphicon glyphicon-user" aria-hidden="true"></span></a>
<a href="/{/output/page}/{@id}" title="Edit character"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></a>
</div>
<div class="panel-body">
<img src="/resources/{/output/cauldron/resources_key}/characters/{@id}.{extension}" class="token {token_type}" draggable="false" />
<div class="rule_system"><xsl:value-of select="rule_system" /></div>
<xsl:if test="hitpoints!=''">
<div>Hit points: <xsl:value-of select="hitpoints" /></div>
</xsl:if>
<xsl:if test="armor_class!=''">
<div><xsl:value-of select="armor_class_label" />: <xsl:value-of select="armor_class" /></div>
</xsl:if>
<xsl:if test="initiative!=''">
<div><xsl:value-of select="initiative_label" />: <xsl:value-of select="initiative" /></div>
</xsl:if>
<xsl:for-each select="custom">
<div><xsl:value-of select="@label" />: <xsl:value-of select="." /></div>
</xsl:for-each>
<xsl:if test="sheet_url!=''">
<div><a href="{sheet_url}" target="_blank">Character sheet</a></div>
</xsl:if>
</div>
<div class="panel-footer">Adventure: <span><xsl:value-of select="adventure" /></span></div>
</div>
</div>
</xsl:for-each>
</div>

<xsl:if test="count(characters/character)&lt;characters/@max">
<div class="btn-group">
<button class="btn btn-default new">New character</button>
</div>
</xsl:if>

<ul class="rule_systems" style="display:none">
<xsl:for-each select="rule_systems/rule_system">
<li id="{@id}"><xsl:value-of select="." /></li>
</xsl:for-each>
</ul>

<div id="help">
<p>When creating a character for a specific rule system, only a few character attributes need to be filled in. They are needed to make certain combat actions a bit easier.</p>
<p>In case you're playing Dungeons &amp; Dragons 5th edition, you can use this <a href="/files/charactersheet/D&amp;D score details.ods">spreadsheet</a> to help you level your character, so you understand all the numbers that are present in your <a href="/files/charactersheet/D&amp;D character sheet.pdf">character sheet</a>.</p>
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
<xsl:if test="character/@id">
<input type="hidden" name="id" value="{character/@id}" />
<input type="hidden" name="extension" value="{character/extension}" />
<img src="/resources/{/output/cauldron/resources_key}/characters/{character/@id}.{character/extension}" class="token {character/token_type}" />
</xsl:if>
<xsl:if test="character/rule_system_id">
<input type="hidden" name="rule_system_id" value="{character/rule_system_id}" />
</xsl:if>

<div class="form-group">
<label for="name">Rule system:</label>
<input type="text" id="name" name="name" value="{character/rule_system}" class="form-control" disabled="disabled" />
</div>
<div class="form-group">
<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{character/name}" maxlength="20" class="form-control" />
</div>
<xsl:if test="character/hitpoints">
<div class="form-group">
<label for="hitpoints">Hit points:</label>
<input type="text" id="hitpoints" name="hitpoints" value="{character/hitpoints}" class="form-control" />
</div>
</xsl:if>
<xsl:if test="character/armor_class">
<div class="form-group">
<label for="armor_class"><xsl:value-of select="armor_class_label" />:</label>
<input type="text" id="armor_class" name="armor_class" value="{character/armor_class}" class="form-control" />
</div>
</xsl:if>
<xsl:if test="character/initiative">
<div class="form-group">
<label for="armor_class"><xsl:value-of select="initiative_label" />:</label>
<input type="text" id="initiative" name="initiative" value="{character/initiative}" class="form-control" />
</div>
</xsl:if>
<xsl:for-each select="custom_options/custom">
<xsl:variable name="custom" select="concat('custom', position()-1)" />
<div class="form-group">
<label for="{$custom}"><xsl:value-of select="." />:</label>
<input type="text" id="{$custom}" name="{$custom}" value="{../../character/*[name()=$custom]}" class="form-control" />
</div>
</xsl:for-each>
<div class="form-group">
<label for="token">Token image:</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="token" style="display:none" class="form-control" onChange="javascript:$('#upload-token').val(this.files[0].name); token_selected();" />Select image</label></span>
<input type="text" id="upload-token" readonly="readonly" class="form-control" />
</div>
<div class="radio-group token_type">
<input type="hidden" name="token_type_backup" value="{character/token_type}" />
<span><input type="radio" name="token_type" value="portrait" disabled="disabled"><xsl:if test="character/token_type='portrait'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Portrait token image</span>
<span><input type="radio" name="token_type" value="topdown" disabled="disabled"><xsl:if test="character/token_type='topdown'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>Top-down token image</span>
<span class="select">&lt;-- select the token type</span>
</div>
</div>
<div class="form-group">
<label for="sheet">Character sheet:</label>
<div class="radio-group">
<span><input type="radio" name="sheet" value="none"><xsl:if test="character/sheet='none'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>None</span>
<span><input type="radio" name="sheet" value="file"><xsl:if test="character/sheet='file'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>File (PDF)</span>
<span><input type="radio" name="sheet" value="url"><xsl:if test="character/sheet='url'"><xsl:attribute name="checked">checked</xsl:attribute></xsl:if></input>URL to remote file or page</span>
</div>
<div class="sheet_file">
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="sheet_file" style="display:none" class="form-control" onChange="javascript:$('#upload-sheet').val(this.files[0].name)" />Select PDF</label></span>
<input type="text" id="upload-sheet" readonly="readonly" class="form-control"><xsl:if test="character/@id and character/sheet='file'"><xsl:attribute name="placeholder">Leave untouched to keep current sheet.</xsl:attribute></xsl:if></input>
</div>
</div>
<div class="sheet_url">
<input type="text" id="sheet_url" name="sheet_url" value="{character/sheet_url}" maxlength="255" class="form-control" />
</div>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Save character" class="btn btn-default" />
<a href="/{/output/page}" class="btn btn-default">Cancel</a>
<xsl:if test="character/@id">
<input type="submit" name="submit_button" value="Delete character" class="btn btn-default" onClick="javascript:return confirm('DELETE: Are you sure?')" />
</xsl:if>
</div>
</form>

<div id="help">
<p><b>Token image:</b> When uploading a token image, you must set the right token type. Each type is controlled via the keyboard in a different way. With a portrait token, W is always up, S is always down, A is always left an D is always right. With a top-down token, you can use the same keys, but which direction the token moves depends on the direction the token is looking. A top-down token is rotated via Q and E.</p>
<p>The <a href="/manual#character">online manual</a> explains the differences between the token types.</p>
<p>You can change your keyboard layout in your <a href="/account">account settings</a>. Cauldron VTT supports Azerty, Qwerty and Qwertz keyboards.</p>
</div>
</xsl:template>

<!--
//
//  Alternates template
//
//-->
<xsl:template match="alternates">
<xsl:call-template name="show_messages" />
<p>Alternate tokens for <xsl:value-of select="@character" />.</p>
<div class="row">

<div class="col-sm-4">
<form action="/{/output/page}" method="post" enctype="multipart/form-data">
<input type="hidden" name="char_id" value="{@char_id}" />
<div class="form-group">
<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{../name}" maxlength="25" class="form-control" />
</div>
<div class="form-group">
<label for="size">Size:</label>
<select name="size" class="form-control"><xsl:for-each select="sizes/size"><option value="{@value}"><xsl:if test="../../../size=@value"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option></xsl:for-each></select>
</div>
<div class="form-group">
<label for="token">Alternate token image (use same type as character's token!):</label>
<div class="input-group">
<span class="input-group-btn"><label class="btn btn-default">
<input type="file" name="token" style="display:none" class="form-control" onChange="$('#upload-token').val(this.files[0].name)" />Select image</label></span>
<input type="text" id="upload-token" readonly="readonly" class="form-control" />
</div>
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Add token" class="btn btn-default" />
<a href="/character" class="btn btn-default">Back</a>
</div>
</form>
</div>

<div class="col-sm-8">
<div class="row">
<xsl:for-each select="alternate">
<div class="col-md-3 col-sm-4 col-xs-6"><div class="alternate"><img src="/resources/{/output/cauldron/resources_key}/characters/{character_id}_{@id}.{extension}" class="token {token_type}" /><span><xsl:value-of select="name" /></span><span><xsl:value-of select="size" /></span><form action="/{/output/page}" method="post"><input type="hidden" name="token_id" value="{@id}" /><input type="submit" name="submit_button" value="delete" class="btn btn-default btn-xs" onClick="javascript:return confirm('DELETE: Are you sure?')" /></form></div></div>
</xsl:for-each>
</div>
</div>

</div>

<div id="help">
<p>Make sure you only use tokens images of the same type as the character's token image. If your character has a top-down token image, only use top-down tokens images here. If your character has a portrait token image, only use portrait tokens images here.</p>
</div>
</xsl:template>

<!--
//
//  Weapons template
//
//-->
<xsl:template match="weapons">
<xsl:call-template name="show_messages" />
<p>Weapons for <xsl:value-of select="@character" />.</p>
<div class="row">

<div class="col-sm-4">
<form action="/{/output/page}" method="post">
<input type="hidden" name="char_id" value="{@char_id}" />
<div class="form-group">
<label for="name">Name:</label>
<input type="text" id="name" name="name" value="{../name}" maxlength="25" class="form-control" />
</div>
<div class="form-group">
<label for="name">Roll:</label>
<input type="text" id="roll" name="roll" value="{../roll}" maxlength="25" class="form-control" />
</div>

<div class="btn-group">
<input type="submit" name="submit_button" value="Add weapon" class="btn btn-default" />
<a href="/character" class="btn btn-default">Back</a>
</div>
</form>
</div>

<div class="col-sm-8">
<table class="table table-striped table-condensed weapons">
<thead><tr><th>Weapon</th><th>Roll</th><th></th></tr></thead>
<tbody>
<xsl:for-each select="weapon">
<tr>
<td><xsl:value-of select="name" /></td>
<td><xsl:value-of select="roll" /></td>
<td><form action="/{/output/page}" method="post"><input type="hidden" name="weapon_id" value="{@id}" /><span class="btn-group"><input type="button" value="edit" class="btn btn-default btn-xs" onClick="javascript:edit_weapon(this)" /><input type="submit" name="submit_button" value="remove" class="btn btn-default btn-xs" onClick="javascript:return confirm('DELETE: Are you sure?')" /></span></form></td>
</tr>
</xsl:for-each>
</tbody>
</table>
</div>

</div>

<div id="help">
<p>Add your character's weapons and their damage rolls. These weapons will be added as blue buttons to the Dice roll window during a session.</p>
<p>The roll field must contain a valid dice roll, like '1d8+2' or '3d6'.</p>
<p>As they are in fact nothing but dice rolls, you can also add rolls for spells, ability checks and saving throws here.</p>
</div>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1><xsl:value-of select="/output/layout/title/@page" /></h1>
<xsl:apply-templates select="overview" />
<xsl:apply-templates select="edit" />
<xsl:apply-templates select="alternates" />
<xsl:apply-templates select="weapons" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
