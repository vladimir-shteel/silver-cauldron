<?xml version="1.0" ?>
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="banshee/main.xslt" />
<xsl:import href="includes/cauldron.xslt" />

<!--
//
//  Adventures template
//
//-->
<xsl:template match="adventures">
<xsl:if test="count(adventure)=0">
<p>No adventures available yet.</p>
</xsl:if>
<div class="row">
<xsl:for-each select="adventure">
<div class="col-sm-12 col-md-6">
<div class="well" style="background-image:url({image})">
<h2><xsl:value-of select="title" /></h2>
<span>Dungeon Master: <xsl:value-of select="dm" /></span>
<div class="btn-group">
<xsl:if test="introduction!=''"><button class="btn btn-primary btn-sm show_introduction{@id}">Introduction</button></xsl:if>
<a href="/{/output/page}/{@id}?spectate" class="btn btn-success btn-sm">Spectate adventure</a>
</div>
</div>
</div>
</xsl:for-each>
</div>

<xsl:for-each select="adventure">
<div class="introduction" id="introduction{@id}" title="{title}" style="display:none"><xsl:value-of disable-output-escaping="yes" select="introduction" /></div>
</xsl:for-each>
</xsl:template>

<!--
//
//  Adventure template
//
//-->
<xsl:template match="adventure">
<!-- Menu -->
<div class="topbar">
<xsl:if test="map">
<div class="btn-group">
<button class="btn btn-primary btn-xs open_menu">Menu</button>
</div>
</xsl:if>
<div class="menu">
<a href="/adventure" class="btn btn-default btn-sm leave">Leave session</a>
<button class="btn btn-default btn-sm show_journal">Journal</button>
<xsl:if test="map/type='video'"><button id="playvideo" onClick="javascript:$('video').get(0).play();" class="btn btn-default btn-sm">Play video</button></xsl:if>
<button class="btn btn-default btn-sm show_collectables">Inventory</button>
<h2>Interface</h2>
<button id="itfcol" class="btn btn-default btn-sm interface_color">Dark interface</button>
<button id="fullscreen" class="btn btn-default btn-sm fullscreen">Fullscreen map (TAB)</button>
<h2>Map switching</h2>
<select class="form-control map-selector" onChange="javascript:change_map()">
<xsl:for-each select="maps/map"><option value="{@id}"><xsl:if test="@current='yes'"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if><xsl:value-of select="." /></option></xsl:for-each>
</select>
</div>
</div>
<xsl:if test="not(map)">
<input id="adventure_id" type="hidden" name="adventure_id" value="{@id}" />
<p class="nomap">No map has been selected yet.</p>
</xsl:if>
<!-- Windows -->
<xsl:if test="map">
<!-- Journal -->
<div class="journal" style="display:none">
<xsl:for-each select="journal/entry">
<xsl:if test="session"><div class="session"><xsl:value-of select="session" /></div></xsl:if>
<xsl:if test="content"><div class="entry"><span class="writer"><xsl:value-of select="writer" /></span><span class="content"><xsl:value-of select="content" /></span></div></xsl:if>
</xsl:for-each>
</div>
<!-- Play area -->
<div class="playarea" version="{/output/cauldron/version}" ws_host="{websocket/host}" ws_port="{websocket/port}" group_key="{group_key}" adventure_id="{@id}" map_id="{map/@id}" user_id="{/output/user/@id}" resources_key="{resources_key}" is_dm="{@is_dm}" grid_cell_size="{grid_cell_size}" show_grid="{map/show_grid}" offset_x="{map/offset_x}" offset_y="{map/offset_y}" drag_character="{map/drag_character}" fog_of_war="{map/fog_of_war}" fow_distance="{map/fow_distance}" name="{characters/@name}">
<xsl:if test="characters/@mine"><xsl:attribute name="my_char"><xsl:value-of select="characters/@mine" /></xsl:attribute></xsl:if>
<xsl:if test="map/audio!=''"><xsl:attribute name="audio"><xsl:value-of select="map/audio" /></xsl:attribute></xsl:if>
<div>
<xsl:if test="map/type='image'"><xsl:attribute name="style">background-image:url(<xsl:value-of select="map/url" />); background-size:<xsl:value-of select="map/width" />px <xsl:value-of select="map/height" />px; width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute></xsl:if>
<xsl:if test="map/type='video'"><xsl:attribute name="style">width:<xsl:value-of select="map/width" />px; height:<xsl:value-of select="map/height" />px;</xsl:attribute>
<video width="{map/width}" height="{map/height}" autoplay="true" loop="true" source="{map/url}" /><xsl:text>
</xsl:text></xsl:if>
<!-- Grid -->
<div class="grid"></div>
<!-- Drawing -->
<div class="drawing"></div>
<!-- Zones -->
<div class="zones">
<xsl:for-each select="zones/zone">
<div id="zone{@id}" class="zone" style="left:{pos_x}px; top:{pos_y}px; background-color:{color}; width:{width}px; height:{height}px; opacity:{opacity};"><xsl:if test="group!=''"><xsl:attribute name="group"><xsl:value-of select="group" /></xsl:attribute></xsl:if><xsl:if test="script!=''"><div class="script"><xsl:value-of select="script" /></div></xsl:if></div>
</xsl:for-each>
</div>
<!-- Walls -->
<div class="walls">
<xsl:for-each select="walls/wall">
<div id="wall{@id}" class="wall" pos_x="{pos_x}" pos_y="{pos_y}" length="{length}" direction="{direction}" transparent="{transparent}" />
</xsl:for-each>
</div>
<!-- Doors -->
<div class="doors">
<xsl:for-each select="doors/door">
<div id="door{@id}" class="door" pos_x="{pos_x}" pos_y="{pos_y}" length="{length}" direction="{direction}" state="{state}" secret="{secret}" bars="{bars}" />
</xsl:for-each>
</div>
<!-- Lights -->
<div class="lights">
<xsl:for-each select="lights/light">
<div id="light{@id}" class="light" radius="{radius}" state="{state}" style="left:{pos_x}px; top:{pos_y}px; width:{../../grid_cell_size}px; height:{../../grid_cell_size}px;" />
</xsl:for-each>
</div>
<!-- Effects -->
<div class="effects"></div>
<!-- Tokens -->
<div class="tokens">
<xsl:for-each select="tokens/token">
<div id="token{instance_id}" class="token" style="left:{pos_x}px; top:{pos_y}px; width:{width}px; display:none;" type="{type}" is_hidden="{hidden}" rotation="{rotation}" armor_class="{armor_class}" hitpoints="{hitpoints}" damage="{damage}">
<xsl:if test="c_id!='' and c_found='no'">
<xsl:attribute name="c_id"><xsl:value-of select="c_id" /></xsl:attribute>
<xsl:attribute name="c_name"><xsl:value-of select="c_name" /></xsl:attribute>
<xsl:attribute name="c_src"><xsl:value-of select="c_src" /></xsl:attribute>
<xsl:attribute name="c_hide"><xsl:value-of select="c_hide" /></xsl:attribute>
</xsl:if>
<xsl:if test="perc">
<div class="hitpoints"><div class="damage" style="width:{perc}%" /></div>
</xsl:if>
<img src="/resources/{../../resources_key}/tokens/{@id}.{extension}" style="height:{height}px;" draggable="false" />
<xsl:if test="name!=''">
<span><xsl:value-of select="name" /></span>
</xsl:if>
</div>
</xsl:for-each>
</div>
<!-- Characters -->
<div class="characters">
<xsl:for-each select="characters/character">
<div id="character{instance_id}" char_id="{@id}" class="character" style="left:{pos_x}px; top:{pos_y}px; width:{width}px;" is_hidden="{hidden}" rotation="{rotation}" initiative="{initiative}" armor_class="{armor_class}" hitpoints="{hitpoints}" damage="{damage}" sheet="{sheet_url}">
<div class="hitpoints"><div class="damage" style="width:{perc}%" /></div>
<img src="/resources/{../../resources_key}/characters/{src}" orig_src="{orig_src}" style="height:{height}px" draggable="false" />
<span class="name"><xsl:value-of select="name" /></span>
</div>
</xsl:for-each>
</div>
<!-- Fog of war -->
<div class="fog_of_war"></div>
<!-- Markers -->
<div class="markers"></div>
</div>
<!-- Alternate icons -->
<div class="alternates">
<xsl:for-each select="alternates/alternate">
<div icon_id="{@id}" size="{size}" filename="{filename}"><xsl:value-of select="name" /></div>
</xsl:for-each>
</div>
</div>
<!-- Right bar -->
<div class="sidebar">
</div>
</xsl:if>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<h1><xsl:value-of select="/output/layout/title/@page" /></h1>
<xsl:apply-templates select="adventures" />
<xsl:apply-templates select="adventure" />
<xsl:apply-templates select="result" />
</xsl:template>

</xsl:stylesheet>
